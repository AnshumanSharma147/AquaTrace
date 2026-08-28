import os
import glob
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import tifffile as tiff
import cv2

# ==========================================
# 1. U-Net Architecture
# ==========================================
class DoubleConv(nn.Module):
    def __init__(self, in_channels, out_channels):
        super(DoubleConv, self).__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True)
        )
    def forward(self, x):
        return self.conv(x)

class UNet(nn.Module):
    def __init__(self, in_channels=1, out_channels=1):
        super(UNet, self).__init__()
        self.down1 = DoubleConv(in_channels, 64)
        self.down2 = DoubleConv(64, 128)
        self.down3 = DoubleConv(128, 256)
        self.down4 = DoubleConv(256, 512)
        
        self.pool = nn.MaxPool2d(2)
        self.up1 = nn.ConvTranspose2d(512, 256, 2, stride=2)
        self.up_conv1 = DoubleConv(512, 256)
        
        self.up2 = nn.ConvTranspose2d(256, 128, 2, stride=2)
        self.up_conv2 = DoubleConv(256, 128)
        
        self.up3 = nn.ConvTranspose2d(128, 64, 2, stride=2)
        self.up_conv3 = DoubleConv(128, 64)
        
        self.out_conv = nn.Conv2d(64, out_channels, 1)

    def forward(self, x):
        d1 = self.down1(x)
        d2 = self.down2(self.pool(d1))
        d3 = self.down3(self.pool(d2))
        d4 = self.down4(self.pool(d3))
        
        u1 = self.up1(d4)
        u1 = torch.cat([d3, u1], dim=1)
        u1 = self.up_conv1(u1)
        
        u2 = self.up2(u1)
        u2 = torch.cat([d2, u2], dim=1)
        u2 = self.up_conv2(u2)
        
        u3 = self.up3(u2)
        u3 = torch.cat([d1, u3], dim=1)
        u3 = self.up_conv3(u3)
        
        return torch.sigmoid(self.out_conv(u3))

# ==========================================
# 2. Dataset Class
# ==========================================
class OilSpillDataset(Dataset):
    def __init__(self, image_dir, mask_dir, target_size=(256, 256)):
        all_image_paths = sorted(glob.glob(os.path.join(image_dir, '*.tif')))
        all_mask_paths = sorted(glob.glob(os.path.join(mask_dir, '*.tif')))
        
        # Create a set of mask basenames for fast lookup
        mask_basenames = {os.path.basename(p) for p in all_mask_paths}
        
        self.image_paths = []
        self.mask_paths = []
        
        # Only keep files that exist in both directories
        for img_path in all_image_paths:
            basename = os.path.basename(img_path)
            if basename in mask_basenames:
                self.image_paths.append(img_path)
                self.mask_paths.append(os.path.join(mask_dir, basename))
                
        self.target_size = target_size
        print(f"Found {len(self.image_paths)} matching image-mask pairs.")

    def __len__(self):
        return len(self.image_paths)
    
    def __getitem__(self, idx):
        # Load 16-bit TIFF image
        img = tiff.imread(self.image_paths[idx])
        # Normalize 16-bit to 8-bit equivalent range [0, 1]
        img = img.astype(np.float32) / 65535.0
        
        # Load mask (assumed to be 0 or 255/1, we'll binarize it)
        mask = tiff.imread(self.mask_paths[idx])
        mask = (mask > 0).astype(np.float32)
        
        # Resize using OpenCV (if target_size is provided)
        if self.target_size:
            img = cv2.resize(img, self.target_size, interpolation=cv2.INTER_LINEAR)
            mask = cv2.resize(mask, self.target_size, interpolation=cv2.INTER_NEAREST)
        
        # Expand dims if image is 2D
        if len(img.shape) == 2:
            img = np.expand_dims(img, axis=-1)
        
        # Change to C, H, W format for PyTorch
        img = np.transpose(img, (2, 0, 1))
        mask = np.expand_dims(mask, axis=0) # 1, H, W
        
        return torch.tensor(img), torch.tensor(mask)

# ==========================================
# 3. Training Loop
# ==========================================
def train_model():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # SAR images (like Sentinel-1) often have 2 channels (VV and VH polarizations).
    # Since your input tensor is [8, 2, 256, 256], we set in_channels=2.
    model = UNet(in_channels=2, out_channels=1).to(device)
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=1e-4)
    
    # Update to point to your local datasets
    train_dataset = OilSpillDataset(image_dir=r'D:\ImgData\oil', mask_dir=r'D:\ImgData\Mask_oil')
    
    # We will just print if no data exists, as it's a structural script
    if len(train_dataset) == 0:
        print("No training data found in data/images and data/masks. Exiting training.")
        # Dummy save for inference step to work without actual training
        torch.save(model.state_dict(), 'unet_oilspill.pt')
        return

    train_loader = DataLoader(train_dataset, batch_size=8, shuffle=True)
    
    num_epochs = 200
    best_loss = float('inf')
    
    for epoch in range(num_epochs):
        model.train()
        epoch_loss = 0
        
        for batch_idx, (images, masks) in enumerate(train_loader):
            images = images.to(device)
            masks = masks.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, masks)
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item()
            
            # Print an update every 10 batches so you know it's not frozen
            if (batch_idx + 1) % 10 == 0:
                print(f"  -> Epoch [{epoch+1}/{num_epochs}], Batch [{batch_idx+1}/{len(train_loader)}], Current Loss: {loss.item():.4f}")
            
        avg_loss = epoch_loss / len(train_loader)
        print(f"Epoch [{epoch+1}/{num_epochs}], Loss: {avg_loss:.4f}")
        
        if avg_loss < best_loss:
            best_loss = avg_loss
            torch.save(model.state_dict(), 'unet_oilspill.pt')
            print("Saved Best Model!")

if __name__ == '__main__':
    train_model()
