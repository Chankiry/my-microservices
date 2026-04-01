import { CreateOptions, DestroyOptions, SaveOptions } from 'sequelize';

export interface CustomCreateOptions<T = any> extends CreateOptions<T> {
    user_id?: string;
}

export interface CustomUpdateOptions<T = any> extends SaveOptions<T> {
    user_id?: string;
}

export interface CustomDestroyOptions extends DestroyOptions {
    user_id?: string;
}