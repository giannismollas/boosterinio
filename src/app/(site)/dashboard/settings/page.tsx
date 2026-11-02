import { ActionForm, SubmitButton } from "@/components/forms";
import { ImageUploader } from "@/components/image-uploader";
import { PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { changePasswordAction, updateProfileAction } from "@/server/actions/account";
import { requireUser } from "@/server/session";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser("/dashboard/settings");
  return (
    <>
      <PageHeader title="Settings" description={`Signed in as ${user.email} · member since ${formatDate(user.createdAt)}`} />
      <div className="grid max-w-3xl gap-6">
        <ActionForm action={updateProfileAction} className="panel space-y-5 p-5 sm:p-6">
          <h2 className="t-display text-[1.75rem] text-ink uppercase">Profile</h2>
          <div>
            <label className="label" htmlFor="s-name">
              Display name
            </label>
            <input id="s-name" name="name" className="field" defaultValue={user.name} required minLength={2} maxLength={40} />
          </div>
          <div>
            <p className="label">Avatar</p>
            <ImageUploader name="avatar" folder="avatars" max={1} initial={user.image ? [user.image] : []} />
          </div>
          <SubmitButton className="btn-coin">Save profile</SubmitButton>
        </ActionForm>

        <ActionForm action={changePasswordAction} resetOnSuccess className="panel space-y-4 p-5 sm:p-6">
          <h2 className="t-display text-[1.75rem] text-ink uppercase">Password</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="s-cur">
                Current password
              </label>
              <input id="s-cur" name="current" type="password" autoComplete="current-password" className="field" required />
            </div>
            <div>
              <label className="label" htmlFor="s-new">
                New password
              </label>
              <input id="s-new" name="next" type="password" autoComplete="new-password" minLength={8} className="field" required />
            </div>
          </div>
          <SubmitButton className="btn-ghost">Change password</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
