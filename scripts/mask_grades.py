from PIL import Image, ImageFilter

def pixelate_region(im, box, pixel_size=12):
    region = im.crop(box)
    small = region.resize(
        (max(1, region.width // pixel_size), max(1, region.height // pixel_size)),
        resample=Image.Resampling.NEAREST
    )
    pixelated = small.resize(region.size, Image.Resampling.NEAREST)
    # Apply a light blur over pixelation for smooth aesthetics
    pixelated = pixelated.filter(ImageFilter.GaussianBlur(radius=2))
    im.paste(pixelated, box)

# 1. Mask grades-breakdown.png
im = Image.open('docs/assets/screenshots/grades-breakdown.png').convert('RGB')
# Box covering Points, Weight Achieved, and Grade numbers
# Keep header intact (y from 65 to 550), mask numbers (x from 310 to 740)
pixelate_region(im, (310, 65, 740, 550), pixel_size=14)
im.save('docs/assets/screenshots/grades-breakdown.png')
print('grades-breakdown.png masked successfully!')

# 2. Check if other images have any sensitive info
# settings-courses.png: blur instructor userids (x from 60 to 220, y from 60 to 450)
im_set = Image.open('docs/assets/screenshots/settings-courses.png').convert('RGB')
# Mask the user ID / section line underneath each course title
# In settings, each course item has title at y, and subtitle (e.g. CHEM220_sblavery_1269) right below
pixelate_region(im_set, (60, 65, 230, 430), pixel_size=10)
im_set.save('docs/assets/screenshots/settings-courses.png')
print('settings-courses.png masked successfully!')
