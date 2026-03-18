import {
    IsString, IsOptional, IsBoolean,
    MinLength, MaxLength,
} from 'class-validator';

export class CreateAppDto {
    @IsString() @MinLength(2) @MaxLength(50)
    id!: string;              // e.g. 'system1' | 'hrm'

    @IsString() @MinLength(1) @MaxLength(100)
    name!: string;

    @IsString() @IsOptional() @MaxLength(500)
    logo?: string;

    @IsString() @IsOptional()
    description?: string;

    @IsBoolean() @IsOptional()
    allow_self_register?: boolean;

    @IsBoolean() @IsOptional()
    require_approval?: boolean;

    @IsBoolean() @IsOptional()
    is_internal?: boolean;
}

export class UpdateAppDto {
    @IsString() @IsOptional() @MaxLength(100)
    name?: string;

    @IsString() @IsOptional() @MaxLength(500)
    logo?: string;

    @IsString() @IsOptional()
    description?: string;

    @IsBoolean() @IsOptional()
    allow_self_register?: boolean;

    @IsBoolean() @IsOptional()
    require_approval?: boolean;

    @IsBoolean() @IsOptional()
    is_internal?: boolean;

    @IsBoolean() @IsOptional()
    is_active?: boolean;
}