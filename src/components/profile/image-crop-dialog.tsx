
"use client";

import { useRef } from "react";
// import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

interface ImageCropDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  onCropComplete: (croppedImageDataUrl: string) => void;
}

// // Utility function to get cropped image data URL
// async function getCroppedImg(
//   image: HTMLImageElement,
//   crop: PixelCrop,
// ): Promise<string | null> {
//   const canvas = document.createElement("canvas");
//   const scaleX = image.naturalWidth / image.width;
//   const scaleY = image.naturalHeight / image.height;
  
//   canvas.width = Math.floor(crop.width * scaleX);
//   canvas.height = Math.floor(crop.height * scaleY);
  
//   const ctx = canvas.getContext("2d");
//   if (!ctx) {
//     return null;
//   }

//   const cropX = crop.x * scaleX;
//   const cropY = crop.y * scaleY;

//   ctx.drawImage(
//     image,
//     cropX,
//     cropY,
//     crop.width * scaleX,
//     crop.height * scaleY,
//     0,
//     0,
//     crop.width * scaleX,
//     crop.height * scaleY
//   );

//   return new Promise((resolve, reject) => {
//     resolve(canvas.toDataURL('image/png'));
//   });
// }


export function ImageCropDialog({ isOpen, onClose, imageSrc, onCropComplete }: ImageCropDialogProps) {
  // const [crop, setCrop] = useState<Crop>();
  // const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  // const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
  //   const { width, height } = e.currentTarget;
  //   const newCrop = centerCrop(
  //     makeAspectCrop(
  //       {
  //         unit: '%',
  //         width: 90, // Initial crop size
  //       },
  //       1 / 1, // Aspect ratio 1:1 for square
  //       width,
  //       height
  //     ),
  //     width,
  //     height
  //   );
  //   setCrop(newCrop);
  //   setCompletedCrop(newCrop as PixelCrop); // Set initial completed crop
  // };

  const handleCrop = async () => {
    // if (completedCrop && imgRef.current) {
    //   const croppedImageDataUrl = await getCroppedImg(imgRef.current, completedCrop);
    //   if (croppedImageDataUrl) {
    //     onCropComplete(croppedImageDataUrl);
    //   }
      onClose();
    // }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crop Your Profile Picture</DialogTitle>
          <DialogDescription>
            Adjust the selection to crop your image. Aim for a square selection.
          </DialogDescription>
        </DialogHeader>
        <div className="my-4 flex justify-center">
          {imageSrc && (
            // <ReactCrop
            //   crop={crop}
            //   onChange={(_, percentCrop) => setCrop(percentCrop)}
            //   onComplete={(c) => setCompletedCrop(c)}
            //   aspect={1} // Force square aspect ratio
            //   minWidth={50} // Minimum crop width in pixels
            //   minHeight={50} // Minimum crop height in pixels
            // >
              <img
                ref={imgRef}
                alt="Crop me"
                src={imageSrc}
                // onLoad={onImageLoad}
                style={{ maxHeight: '70vh', objectFit: 'contain' }}
                data-ai-hint="uploaded image"
              />
            // </ReactCrop>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleCrop} disabled={true}>
            Save Cropped Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
