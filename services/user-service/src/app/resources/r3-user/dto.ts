import { IsString, IsEmail, IsOptional, MinLength, MaxLength, IsArray, IsBoolean } from 'class-validator';

export class CreateUserDto {
    @IsString()
    @MinLength(3)
    @MaxLength(50)
    username: string;

    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    @MaxLength(100)
    password: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    firstName?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    lastName?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    roles?: string[];
}

export class UpdateUserDto extends CreateUserDto {
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsBoolean()
    @IsOptional()
    emailVerified?: boolean;
}