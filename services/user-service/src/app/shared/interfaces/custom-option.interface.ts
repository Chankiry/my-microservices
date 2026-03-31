import { CreateOptions, UpdateOptions, DestroyOptions, SaveOptions } from 'sequelize';

export interface CustomCreateOptions<T = any> extends CreateOptions<T> {
    user_id?: string;
}

export interface CustomUpdateOptions<T = any> extends UpdateOptions<T> {
    user_id?: string;
}

// Fix: Omit 'fields' from SaveOptions to avoid keyof type clash,
// then re-add it as optional string[] for flexibility.
export interface CustomSaveOptions extends Omit<SaveOptions, 'fields'> {
    user_id?: string;
    fields?: string[];
}
 

export interface CustomDestroyOptions extends DestroyOptions {
    user_id?: string;
}