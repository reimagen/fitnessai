
"use client";

import { useState, useRef, type ChangeEvent } from "react";
import type { UserProfile } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Save, XCircle, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ImageCropDialog } from "./image-crop-dialog"; // Import the new dialog

type UserDetailsCardProps = {
  user: UserProfile;
  onNameUpdate: (newName: string) => void;
  onAvatarUpdate: (newAvatarDataUrl: string) => void;
};

export function UserDetailsCard({ user, onNameUpdate, onAvatarUpdate }: UserDetailsCardProps) {
  const { toast } = useToast();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user.name);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  const primaryGoal = user.fitnessGoals.find(g => g.isPrimary);
  const displayGoal = primaryGoal || user.fitnessGoals.find(g => g.isPrimary !== false) || user.fitnessGoals[0];

  const handleEditClick = () => {
    setEditedName(user.name);
    setIsEditingName(true);
  };

  const handleCancelClick = () => {
    setIsEditingName(false);
  };

  const handleSaveClick = () => {
    if (editedName.trim() === "") {
      toast({
        title: "Invalid Name",
        description: "Name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    onNameUpdate(editedName);
    setIsEditingName(false);
    toast({
      title: "Name Updated!",
      description: "Your profile name has been saved.",
    });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawImageSrc(reader.result as string);
        setIsCropModalOpen(true); // Open crop dialog instead of immediate update
      };
      reader.readAsDataURL(file);
    }
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleCropComplete = (croppedImageDataUrl: string) => {
    onAvatarUpdate(croppedImageDataUrl);
    setIsCropModalOpen(false); // Close dialog after crop
    setRawImageSrc(null); // Clear raw image src
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col items-center text-center sm:flex-row sm:text-left">
          <div 
            className="relative group h-24 w-24 mb-4 sm:mb-0 sm:mr-6 rounded-full cursor-pointer"
            onClick={handleAvatarClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleAvatarClick()}
            aria-label="Change profile picture"
          >
            <Avatar
              className={cn(
                "h-full w-full ring-2 ring-primary ring-offset-2 transition-opacity group-hover:opacity-70"
              )}
            >
              <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person portrait" />
              <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Camera className="h-8 w-8 text-white" />
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            aria-hidden="true"
          />
          <div className="flex-grow">
            {isEditingName ? (
              <div className="flex flex-col gap-2 items-center sm:items-start">
                <Input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-xl font-semibold leading-none tracking-tight"
                  aria-label="Edit user name"
                />
              </div>
            ) : (
              <>
                <CardTitle className="font-headline text-2xl">{user.name}</CardTitle>
              </>
            )}
          </div>
          {isEditingName ? (
            <div className="flex gap-2 mt-4 sm:mt-0 sm:ml-auto">
              <Button variant="outline" size="icon" onClick={handleCancelClick} aria-label="Cancel name edit">
                <XCircle className="h-5 w-5" />
              </Button>
              <Button size="icon" onClick={handleSaveClick} aria-label="Save new name">
                <Save className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" className="sm:ml-auto mt-4 sm:mt-0" onClick={handleEditClick} aria-label="Edit profile name">
              <Edit2 className="h-5 w-5" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="mt-4 space-y-2">
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Joined:</h4>
              <p>June 1, 2025</p>
            </div>
             <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Primary Goal:</h4>
              <p className="text-accent font-medium">{displayGoal?.description || "Not set"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {rawImageSrc && (
        <ImageCropDialog
          isOpen={isCropModalOpen}
          onClose={() => {
            setIsCropModalOpen(false);
            setRawImageSrc(null);
          }}
          imageSrc={rawImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </>
  );
}
