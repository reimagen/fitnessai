import { useToast } from "@/hooks/useToast";
import { useUpdateUserProfile } from "@/lib/firestore.service";
import type { UserProfile } from "@/lib/types";

type UpdatePayload = Partial<UserProfile>;

type UseProfileUpdateOptions = {
  successTitle: string;
  successDescription: string;
};

export function useProfileUpdate() {
  const { toast } = useToast();
  const updateUserMutation = useUpdateUserProfile();

  const updateProfile = (data: UpdatePayload, options: UseProfileUpdateOptions) => {
    updateUserMutation.mutate(data, {
      onSuccess: () => {
        toast({
          title: options.successTitle,
          description: options.successDescription,
        });
      },
      onError: (error) => {
        toast({ title: "Update Failed", description: error.message, variant: "destructive" });
      },
    });
  };

  return {
    updateProfile,
    isPending: updateUserMutation.isPending,
  };
}
