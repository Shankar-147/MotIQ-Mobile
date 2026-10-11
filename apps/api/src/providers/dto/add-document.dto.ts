import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

const DOCUMENT_TYPES = ['driving_license', 'vehicle_registration', 'id_proof'] as const;

export class AddDocumentDto {
  @IsIn(DOCUMENT_TYPES)
  type!: (typeof DOCUMENT_TYPES)[number];

  // Link to the uploaded image. File storage is not built yet, so this is
  // just a reference the admin can open.
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  fileUrl!: string;
}
