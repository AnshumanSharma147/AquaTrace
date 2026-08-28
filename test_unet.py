import os
import glob
import torch
import numpy as np
import tifffile as tiff
import cv2
from train_unet import UNet # Import the model architecture we just built!

# ==========================================
# Configuration
# ==========================================
MODEL_WEIGHTS = 'unet_oilspill.pt'
TEST_IMAGES_DIR = r'D:\ImgData\oil'
OUTPUT_DIR = 'test_results'
TARGET_SIZE = (256, 256)

def test_model():
    # 1. Setup device and model
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # Initialize model with 2 channels to match our training
    model = UNet(in_channels=2, out_channels=1).to(device)
    model.load_state_dict(torch.load(MODEL_WEIGHTS, map_location=device))
    model.eval() # Set to evaluation mode
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # 2. Get all test images
    test_images = sorted(glob.glob(os.path.join(TEST_IMAGES_DIR, '*.tif')))
    
    # We will just test the last 10 images as a quick sanity check
    # You can change this to `test_images` to process all of them
    images_to_test = test_images 
    
    print(f"Running inference on {len(images_to_test)} images...")
    
    # 3. Inference Loop
    with torch.no_grad(): # Don't track gradients during testing
        for img_path in images_to_test:
            filename = os.path.basename(img_path)
            
            # Load and preprocess exactly like we did in the Dataset
            img_raw = tiff.imread(img_path)
            img = img_raw.astype(np.float32) / 65535.0
            
            img_resized = cv2.resize(img, TARGET_SIZE, interpolation=cv2.INTER_LINEAR)
            
            # Change to C, H, W
            img_tensor = np.transpose(img_resized, (2, 0, 1))
            # Add batch dimension (1, C, H, W)
            img_tensor = np.expand_dims(img_tensor, axis=0) 
            img_tensor = torch.tensor(img_tensor).to(device)
            
            # Run the model!
            output = model(img_tensor)
            
            # Post-process the output
            # output shape is [1, 1, 256, 256], with values between 0 and 1 (Sigmoid)
            pred_mask = output.squeeze().cpu().numpy()
            
            # Binarize the mask (e.g., > 0.5 is an oil spill)
            binary_mask = (pred_mask > 0.5).astype(np.uint8) * 255
            
            # --- NOISE FILTERING ---
            # The model might predict tiny isolated "dots" because it was only trained for 10 epochs.
            # We can use OpenCV to find all the separate blobs and delete the ones that are too small.
            num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(binary_mask, connectivity=8)
            
            # Create a new blank mask
            filtered_mask = np.zeros_like(binary_mask)
            
            # Loop through all detected blobs (skip label 0, which is the black background)
            for i in range(1, num_labels):
                area = stats[i, cv2.CC_STAT_AREA]
                # Only keep blobs that are larger than 50 pixels
                if area > 50: 
                    filtered_mask[labels == i] = 255
                    
            # Resize the FILTERED mask BACK to the original image's dimensions
            original_height, original_width = img_raw.shape[:2]
            binary_mask_original_size = cv2.resize(filtered_mask, (original_width, original_height), interpolation=cv2.INTER_NEAREST)
            
            # Create a beautiful overlay!
            # 1. Take the first channel of the original 16-bit image for visualization
            vis_img = img_raw[:, :, 0] if len(img_raw.shape) > 2 else img_raw
            
            # 2. Normalize it to 8-bit (0-255) for standard RGB viewing
            vis_img = cv2.normalize(vis_img, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
            
            # 3. Convert grayscale to BGR color
            color_bg = cv2.cvtColor(vis_img, cv2.COLOR_GRAY2BGR)
            
            # 4. Create a red overlay where the mask is white
            # Create a purely red image
            red_overlay = np.zeros_like(color_bg)
            red_overlay[:, :] = [0, 0, 255] # BGR format
            
            # Apply the mask to the red overlay
            oil_spill_pixels = cv2.bitwise_and(red_overlay, red_overlay, mask=binary_mask_original_size)
            
            # 5. Blend them together (70% original, 60% red mask)
            final_overlay = cv2.addWeighted(color_bg, 0.8, oil_spill_pixels, 0.6, 0)
            
            # Save the result as a PNG
            out_path = os.path.join(OUTPUT_DIR, f"overlay_{filename.replace('.tif', '.png')}")
            cv2.imwrite(out_path, final_overlay)
            print(f"Saved prediction overlay for {filename} -> {out_path}")

if __name__ == '__main__':
    test_model()
