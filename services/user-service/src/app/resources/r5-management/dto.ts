import {
    IsString, IsArray, IsOptional,
    IsIn, MaxLength,
} from 'class-validator';

export class GrantAccessDto {
    @IsString()
    system_id!: string;

    @IsString()
    @IsIn(['public', 'managed', 'internal'])
    account_type!: 'public' | 'managed' | 'internal';

    @IsArray() @IsString({ each: true }) @IsOptional()
    system_roles?: string[];
}

export class UpdateAccessDto {
    @IsArray() @IsString({ each: true }) @IsOptional()
    system_roles?: string[];

    @IsString() @IsOptional()
    @IsIn(['active', 'suspended'])
    registration_status?: 'active' | 'suspended';
}

export class RejectAccessDto {
    @IsString() @IsOptional() @MaxLength(500)
    reason?: string;
}

// Called by external systems to notify user-service that a
// user's platform role changed inside their own system.
// The user is identified by their external_id (the calling system's own PK).
export class ExternalRoleChangeDto {
    @IsString()
    external_id!: string;          // the user's ID in the calling system

    @IsArray() @IsString({ each: true })
    system_roles!: string[];       // the new full set of roles (replaces old)
}