export enum TranslateEnum {
    KH  = 'kh',
    EN  = 'en'
}

export class BaseTranslate {
    name_kh: string;
    name_en: string

    constructor(
        name_kh: string, 
        name_en: string = name_kh, 
    ) {
        this.name_kh = name_kh;
        this.name_en = name_en
    }
}