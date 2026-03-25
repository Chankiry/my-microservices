import { HelperNavigationItem } from 'helper/components/navigation';

const adminNavigation: HelperNavigationItem[] = [
    {
        id: 'dashboard',
        type: 'basic',
        icon: 'mdi:home-outline',
        link: '/admin/dashboard',
    },
    {
        id  : 'profile',
        type: 'basic',
        icon: 'mdi:account-circle-outline',
        link: '/profile/my-profile',
    },
];

export const navigationData = {
    admin: adminNavigation
};
