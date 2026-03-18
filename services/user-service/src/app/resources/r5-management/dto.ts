import {
    IsString, IsArray, IsOptional,
    IsIn, MaxLength,
} from 'class-validator';

export class GrantAccessDto {
    @IsString()
    app_id!: string;

    @IsString()
    @IsIn(['public', 'managed', 'internal'])
    account_type!: 'public' | 'managed' | 'internal';

    // Roles to assign in this app — must match Keycloak client roles
    @IsArray() @IsString({ each: true }) @IsOptional()
    app_roles?: string[];
}

export class UpdateAccessDto {
    @IsArray() @IsString({ each: true }) @IsOptional()
    app_roles?: string[];

    @IsString() @IsOptional()
    @IsIn(['active', 'suspended'])
    registration_status?: 'active' | 'suspended';
}

export class RejectAccessDto {
    @IsString() @IsOptional() @MaxLength(500)
    reason?: string;
}