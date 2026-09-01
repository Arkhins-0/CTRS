import type { raceCategories } from "@ctr/db";
import { Field, Input, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { MediaPickerInput } from "@/components/media/media-picker";

type Category = typeof raceCategories.$inferSelect;

/** Shared field set for /categories/new and /categories/[id]. */
export function CategoryFormFields({
  category,
  imageThumbUrl,
}: {
  category?: Category;
  imageThumbUrl?: string | null;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}

      <Field label="Name" hint={category ? undefined : "The slug is generated from this."}>
        <Input
          name="name"
          required
          maxLength={200}
          defaultValue={category?.name ?? ""}
          placeholder="Indian Super Touring Cars"
        />
      </Field>
      <Field label="Short name" hint="Used on chips, session labels and tables.">
        <Input
          name="shortName"
          required
          maxLength={60}
          defaultValue={category?.shortName ?? ""}
          placeholder="ISC"
        />
      </Field>
      {category ? (
        <Field label="Slug" className="sm:col-span-2">
          <Input name="slug" maxLength={120} defaultValue={category.slug} pattern="[a-z0-9-]+" />
        </Field>
      ) : null}
      <Field label="Description" className="sm:col-span-2">
        <Textarea name="description" rows={4} defaultValue={category?.description ?? ""} />
      </Field>
      <Field label="Car spec" className="sm:col-span-2" hint="Machinery raced in this class.">
        <Textarea name="carSpec" rows={3} defaultValue={category?.carSpec ?? ""} />
      </Field>
      <div className="flex flex-wrap gap-4">
        <Field label="Colour" hint="Class colour across both apps.">
          <input
            type="color"
            name="color"
            defaultValue={category?.color ?? "#FFC800"}
            className="h-9 w-14 cursor-pointer border border-line bg-surface p-0.5"
          />
        </Field>
        <Field label="Sort" hint="Lower numbers appear first.">
          <Input
            name="sort"
            type="number"
            min={0}
            max={999}
            defaultValue={category?.sort ?? 0}
            className="w-24"
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 self-end pb-2 text-sm font-bold uppercase tracking-wide text-fg">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={category?.isActive ?? true}
          className="size-4 accent-f1-red"
        />
        Active category
      </label>
      <Field label="Image" className="sm:col-span-2" hint="Category hero used on the public site.">
        <MediaPickerInput
          defaultFolder="categories"
          name="imageMediaId"
          initialId={category?.imageMediaId}
          initialUrl={imageThumbUrl}
        />
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton>{category ? "Save category" : "Create category"}</SubmitButton>
      </div>
    </div>
  );
}
