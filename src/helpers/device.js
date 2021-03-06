export const isDesktop = () => window.innerWidth > 900;
export const isTabletOrMobile = () => window.innerWidth <= 900;
export const isMobile = () => window.innerWidth < 640;
export const isIEEdge = navigator.userAgent.indexOf('Edge') > -1;
export const isIE11 = navigator.userAgent.indexOf('Trident/7.0') > -1;
export const isIE = isIEEdge || isIE11;
export const isIOS = window.navigator.userAgent.match(/(iPad|iPhone|iPod)/i);
export const isAndroid = window.navigator.userAgent.match(/Android/i);
export const isMac = navigator.appVersion.indexOf('Mac') > -1;