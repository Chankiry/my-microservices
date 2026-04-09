export enum SystemRoleTypeEnum {
    REALM  = 'realm',
    CLIENT = 'client',
}

export enum RealmRoleIdEnum {
    ADMIN = 'e7d22451-403f-45a1-9606-7d728e223d7e',
    USER  = 'b7a2a59c-585f-4e90-a280-3df969292b63',
}

export enum PLTRoleIdEnum {
    ADMIN = '61d7e441-5386-422d-bf95-88f5a6ede863',
    USER  = '96827a35-59d9-42d7-b769-ce7a0b109de2',
}

export enum SystemEnum {
    ACCOUNT_SYSTEM  = 'mlmupc-account-system',
    PLT             = 'plt',
}

export enum UserSystemAccessRegistrationStatusEnum {
    PENDING   = 'pending',
    ACTIVE    = 'active',
    SUSPENDED = 'suspended',
    REJECTED  = 'rejected',
}

export enum UserSystemAccessAccountTypeEnum {
    PUBLIC  = 'public',
    MANAGED = 'managed',
    INTERNAL = 'internal',
}