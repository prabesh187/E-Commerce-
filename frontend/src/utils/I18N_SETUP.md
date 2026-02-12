# i18next Configuration Documentation

## Overview

This project uses i18next for internationalization (i18n) with support for English and Nepali languages.

## Configuration

The i18next configuration is located in `frontend/src/utils/i18n.ts`.

### Features

1. **Language Detection**: Automatically detects user's preferred language from:
   - localStorage (first priority)
   - Browser navigator settings
   - HTML lang attribute

2. **Translation Namespaces**: 
   - Default namespace: `translation`
   - All translations are organized in a single namespace for simplicity

3. **Language Persistence**: 
   - User's language preference is saved to localStorage
   - HTML lang attribute is updated for accessibility

4. **Fallback Language**: 
   - English (en) is used as fallback if translation is missing

## Translation Files

Translation files are located in `frontend/src/locales/`:
- `en.json` - English translations
- `ne.json` - Nepali translations

### Translation Structure

```json
{
  "common": {
    "loading": "Loading...",
    "error": "An error occurred",
    ...
  },
  "nav": {
    "home": "Home",
    "products": "Products",
    ...
  },
  ...
}
```

## Usage in Components

### Basic Usage

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.loading')}</h1>
      <p>{t('product.title')}</p>
    </div>
  );
}
```

### Changing Language

```tsx
import { useTranslation } from 'react-i18next';

function LanguageSelector() {
  const { i18n } = useTranslation();
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };
  
  return (
    <div>
      <button onClick={() => changeLanguage('en')}>English</button>
      <button onClick={() => changeLanguage('ne')}>नेपाली</button>
    </div>
  );
}
```

### Getting Current Language

```tsx
const { i18n } = useTranslation();
const currentLanguage = i18n.language; // 'en' or 'ne'
```

## Supported Languages

- **English (en)**: Default language
- **Nepali (ne)**: Secondary language

## Adding New Translations

1. Add the translation key to both `en.json` and `ne.json`
2. Use the translation key in your component with `t('key.path')`

Example:
```json
// en.json
{
  "myFeature": {
    "title": "My Feature Title"
  }
}

// ne.json
{
  "myFeature": {
    "title": "मेरो सुविधा शीर्षक"
  }
}
```

```tsx
// Component
const { t } = useTranslation();
<h1>{t('myFeature.title')}</h1>
```

## Best Practices

1. **Organize translations by feature**: Group related translations together
2. **Use descriptive keys**: Make translation keys self-explanatory
3. **Keep translations consistent**: Use the same terminology across the app
4. **Test both languages**: Always verify translations in both English and Nepali
5. **Handle missing translations**: The fallback language (English) will be used if a translation is missing

## Accessibility

The configuration automatically updates the HTML `lang` attribute when the language changes, improving accessibility for screen readers and other assistive technologies.

## Performance

- Translations are loaded synchronously at app startup
- No lazy loading is configured (all translations are bundled)
- React Suspense is disabled for better SSR compatibility
