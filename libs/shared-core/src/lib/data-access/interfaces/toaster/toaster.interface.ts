/**
 * Toaster type.
 */
export type ToastType = 'error' | 'success' | 'warn' | 'accent' | 'primary';

/**
 * Toaster extra class.
 */
export type ToasterExtraClass = 'error-bg' | 'success-bg' | 'warn-bg' | 'accent-bg' | 'primary-bg';

/**
 * Toaster extra classes.
 */
export type ToasterExtraClasses = ToasterExtraClass[];

/**
 * Toaster classes object.
 */
export interface ToasterExtraClassesObj {
  error: ToasterExtraClasses;
  success: ToasterExtraClasses;
  warning: ToasterExtraClasses;
  accent: ToasterExtraClasses;
  primary: ToasterExtraClasses;
};

/**
 * Returns extra classes for toaster depending on provided toaster type.
 * @param toasterType toaster type
 */
export const toasterExtraClasses = (toasterType: ToastType): ToasterExtraClasses => {
  const extraClasses: ToasterExtraClassesObj = {
    error: ['error-bg'],
    success: ['success-bg'],
    warning: ['warn-bg'],
    accent: ['accent-bg'],
    primary: ['primary-bg']
  };
  return extraClasses[toasterType] || [];
};