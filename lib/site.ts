import type { Lang } from './types'

export const LANGS: Lang[] = ['az', 'ru']

const dev = process.env.NODE_ENV !== 'production'

export const SITE_URL: Record<Lang, string> = {
  az: process.env.NEXT_PUBLIC_SITE_URL_AZ ?? (dev ? 'http://localhost:3000' : 'https://lider.com.az'),
  ru: process.env.NEXT_PUBLIC_SITE_URL_RU ?? (dev ? 'http://ru.localhost:3000' : 'https://ru.lider.com.az'),
}

export function isLang(v: string): v is Lang {
  return (LANGS as string[]).includes(v)
}

interface MenuItem {
  href: string
  label: string
}

interface SiteText {
  htmlLang: string
  title: string
  description: string
  topMenu: MenuItem[]
  mainMenu: MenuItem[]
  otherLabel: string
  otherMenu: MenuItem[]
  footerMenu: MenuItem[]
  footerInfo: string[]
  searchPlaceholder: string
  searchButton: string
  feedTitle: string
  popularTitle: string
  readMore: string
  loadMore: string
  searchTitle: string
  searchEmpty: string
  notFound: string
  adPlaceholder: string | null
  /** smartphone template */
  m: {
    menuCols: [MenuItem[], MenuItem[]]
    footerMenu: MenuItem[]
    latestTitle: string
    relatedTitle: string
    searchPlaceholder: string
    adPlaceholder: string | null
    sliderCategoryId?: number
  }
}

export const SITE: Record<Lang, SiteText> = {
  az: {
    htmlLang: 'az',
    title: 'Lider.com.az',
    description: 'Lider.com.az – Azərbaycan və dünya xəbərləri',
    topMenu: [
      { href: '/about.html', label: 'Haqqımızda' },
      { href: '/reklam.html', label: 'Reklam' },
      { href: '/contact.html', label: 'Əlaqə' },
    ],
    mainMenu: [
      { href: '/', label: 'Ana səhifə' },
      { href: '/gundem/', label: 'Gündəm' },
      { href: '/siyaset/', label: 'Siyasət' },
      { href: '/iqtisadiyyat/', label: 'İqtisadiyyat' },
      { href: '/medeniyyet/', label: 'Mədəniyyət' },
      { href: '/sosial/', label: 'Sosial' },
      { href: '/hadise/', label: 'Hadisə' },
      { href: '/region/', label: 'Region' },
      { href: '/musahibe/', label: 'Müsahibə' },
      { href: '/dunya/', label: 'Dünya' },
      { href: '/idman/', label: 'İdman' },
    ],
    otherLabel: 'Digər',
    otherMenu: [
      { href: '/aktual/', label: 'Aktual' },
      { href: '/arasdirma/', label: 'Araşdırma' },
      { href: '/maraqli/', label: 'Maraqlı' },
      { href: '/video/', label: 'Video' },
    ],
    footerMenu: [
      { href: '/', label: 'Ana səhifə' },
      { href: '/about.html', label: 'Haqqımızda' },
      { href: '/reklam.html', label: 'Reklam' },
      { href: '/contact.html', label: 'Əlaqə' },
    ],
    footerInfo: [
      'Baş redaktor: Səyarə Heydərova',
      'Tel: (+99470) 598 00 35',
      'E-mail: sayyara.heyderova@mail.ru',
      'Ünvan: Bakı şəh, Xətai ray, X.Məmmədov küç, ev 21, m 27',
    ],
    searchPlaceholder: 'Saytda axtar...',
    searchButton: 'Axtar',
    feedTitle: 'Xəbər lenti',
    popularTitle: 'Çox oxunanlar',
    readMore: 'Ətraflı oxumaq',
    loadMore: 'Daha çox',
    searchTitle: 'Axtarış nəticələri',
    searchEmpty: 'Heç nə tapılmadı.',
    notFound: 'Səhifə tapılmadı',
    adPlaceholder: 'Sizin Reklam Burada',
    m: {
      menuCols: [
        [
          { href: '/gundem/', label: 'Gündəm' },
          { href: '/siyaset/', label: 'Siyasət' },
          { href: '/iqtisadiyyat/', label: 'İqtisadiyyat' },
          { href: '/medeniyyet/', label: 'Mədəniyyət' },
          { href: '/hadise/', label: 'Hadisə' },
          { href: '/sosial/', label: 'Sosial' },
          { href: '/aktual/', label: 'Aktual' },
        ],
        [
          { href: '/region/', label: 'Region' },
          { href: '/musahibe/', label: 'Müsahibə' },
          { href: '/idman/', label: 'İdman' },
          { href: '/dunya/', label: 'Dünya' },
          { href: '/arasdirma/', label: 'Araşdırma' },
          { href: '/maraqli/', label: 'Maraqlı' },
          { href: '/video/', label: 'Video' },
        ],
      ],
      footerMenu: [
        { href: '/', label: 'Ana səhifə' },
        { href: '/about.html', label: 'Haqqımızda' },
        { href: '/contact.html', label: 'Əlaqə' },
      ],
      latestTitle: 'SON XƏBƏRLƏR',
      relatedTitle: 'Oxşar xəbərlər',
      searchPlaceholder: 'Axtar',
      adPlaceholder: 'Sizin reklam burada',
      sliderCategoryId: 1,
    },
  },
  ru: {
    htmlLang: 'ru',
    title: 'Lider.com.az',
    description: 'Lider.com.az – новости Азербайджана и мира',
    topMenu: [
      { href: '/about.html', label: 'О нас' },
      { href: '/reklam.html', label: 'Реклама' },
      { href: '/contact.html', label: 'Контакт' },
    ],
    mainMenu: [
      { href: '/', label: 'Главная' },
      { href: '/gundem/', label: 'Повестка дня' },
      { href: '/siyaset/', label: 'Политика' },
      { href: '/iqtisadiyyat/', label: 'Эконом' },
      { href: '/medeniyyet/', label: 'Культура' },
      { href: '/sosial/', label: 'Социальное' },
      { href: '/hadise/', label: 'Событие' },
      { href: '/region/', label: 'Область' },
      { href: '/dunya/', label: 'Мир' },
      { href: '/idman/', label: 'Спорт' },
    ],
    otherLabel: 'Другой',
    otherMenu: [
      { href: '/musahibe/', label: 'Интервью' },
      { href: '/aktual/', label: 'Текущий' },
      { href: '/arasdirma/', label: 'Исследовать' },
      { href: '/maraqli/', label: 'Интересный' },
      { href: '/video/', label: 'Видео' },
    ],
    footerMenu: [
      { href: '/', label: 'Главная страница' },
      { href: '/about.html', label: 'О нас' },
      { href: '/reklam.html', label: 'Реклама' },
      { href: '/contact.html', label: 'Контакт' },
    ],
    footerInfo: [
      'Главный редактор: Сайяра Гейдарова',
      'Телефон: (+99470) 598 00 35',
      'Адрес: город Баку, Хатаинский район, улица Х.Мамедова, дом 21, м 27',
    ],
    searchPlaceholder: 'Поиск по сайту...',
    searchButton: 'Поиск',
    feedTitle: 'Новостная лента',
    popularTitle: 'Самые читаемые',
    readMore: 'Подробнее',
    loadMore: 'Ещё',
    searchTitle: 'Результаты поиска',
    searchEmpty: 'Ничего не найдено.',
    notFound: 'Страница не найдена',
    adPlaceholder: null,
    m: {
      menuCols: [
        [
          { href: '/', label: 'Главная страница' },
          { href: '/gundem/', label: 'Повестка дня' },
          { href: '/siyaset/', label: 'Политика' },
          { href: '/iqtisadiyyat/', label: 'Эконом' },
          { href: '/medeniyyet/', label: 'Культура' },
          { href: '/sosial/', label: 'Социальное' },
          { href: '/hadise/', label: 'Событие' },
        ],
        [
          { href: '/musahibe/', label: 'Интервью' },
          { href: '/dunya/', label: 'Мир' },
          { href: '/idman/', label: 'Спорт' },
          { href: '/aktual/', label: 'Текущий' },
          { href: '/arasdirma/', label: 'Исследовать' },
          { href: '/maraqli/', label: 'Интересный' },
          { href: '/video/', label: 'Видео' },
        ],
      ],
      footerMenu: [
        { href: '/about.html', label: 'О нас' },
        { href: '/reklam.html', label: 'Реклама' },
        { href: '/contact.html', label: 'Контакт' },
      ],
      latestTitle: 'ПОСЛЕДНИЕ НОВОСТИ',
      relatedTitle: 'Похожие новости',
      searchPlaceholder: 'Поиск',
      adPlaceholder: null,
    },
  },
}

export const SOCIAL = {
  facebook: 'https://www.facebook.com/',
  instagram: 'https://www.instagram.com/',
  twitter: 'https://twitter.com',
  youtube: 'https://youtube.com',
}
