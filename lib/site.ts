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

interface ContactText {
  intro: string
  emailLabel: string
  phoneLabel: string
  addressLabel: string
  address: string
  formTitle: string
  name: string
  email: string
  phone: string
  subject: string
  message: string
  send: string
  sending: string
  sent: string
  failed: string
}

/** Contact details shown on /contact.html (both sites). */
export const CONTACT = {
  email: 'info@lider.com.az',
  phone: '(+99470) 598 00 35',
  phoneHref: 'tel:+994705980035',
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
  /** ainsyndication slot for the desktop side banners (original main.tpl), null = no ads */
  sideAdSlot: string | null
  contact: ContactText
  footer: {
    about: string
    sectionsTitle: string
    siteTitle: string
    siteLinks: MenuItem[]
    contactTitle: string
    copyright: string
    citation: string
    legal: MenuItem[]
  }
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
      'E-mail: info@lider.com.az',
      'Ünvan: Bakı şəh., Xətai ray., X.Məmmədov küç., ev 21, m. 27',
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
    adPlaceholder: null,
    sideAdSlot: '9236',
    contact: {
      intro: 'Xəbər, təklif, şikayət və ya əməkdaşlıq üçün bizə yazın.',
      emailLabel: 'E-poçt',
      phoneLabel: 'Telefon',
      addressLabel: 'Ünvan',
      address: 'Bakı şəh., Xətai ray., X.Məmmədov küç., ev 21, m. 27',
      formTitle: 'Bizə yazın',
      name: 'Adınız',
      email: 'E-poçtunuz',
      phone: 'Telefon (istəyə görə)',
      subject: 'Mövzu (istəyə görə)',
      message: 'Mesajınız',
      send: 'Göndər',
      sending: 'Göndərilir…',
      sent: 'Mesajınız göndərildi. Təşəkkür edirik, tezliklə cavab verəcəyik.',
      failed: 'Mesaj göndərilmədi. Bir az sonra yenidən cəhd edin və ya info@lider.com.az ünvanına yazın.',
    },
    footer: {
      about: 'Lider.com.az – müstəqil xəbər portalı. Azərbaycan və dünyada baş verən siyasi, iqtisadi, sosial, mədəni və idman hadisələrini operativ və qərəzsiz şəkildə oxuculara çatdırır.',
      sectionsTitle: 'Bölmələr',
      siteTitle: 'Lider.com.az',
      siteLinks: [
        { href: '/about.html', label: 'Haqqımızda' },
        { href: '/redaksiya.html', label: 'Redaksiya' },
        { href: '/reklam.html', label: 'Reklam' },
        { href: '/contact.html', label: 'Əlaqə' },
        { href: '/rss.xml', label: 'RSS' },
      ],
      contactTitle: 'Əlaqə',
      copyright: 'Bütün hüquqlar qorunur.',
      citation: 'Saytdakı materiallardan istifadə zamanı istinad mütləqdir. İnternet səhifələrində istifadə edildikdə hiperlink vasitəsilə istinad olunmalıdır.',
      legal: [
        { href: '/istifade-qaydalari.html', label: 'İstifadə qaydaları' },
        { href: '/mexfilik-siyaseti.html', label: 'Məxfilik siyasəti' },
      ],
    },
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
      adPlaceholder: null,
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
      'E-mail: info@lider.com.az',
      'Адрес: г. Баку, Хатаинский р-н, ул. Х.Мамедова, д. 21, кв. 27',
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
    sideAdSlot: null,
    contact: {
      intro: 'Новости, предложения, жалобы и вопросы сотрудничества — напишите нам.',
      emailLabel: 'E-mail',
      phoneLabel: 'Телефон',
      addressLabel: 'Адрес',
      address: 'г. Баку, Хатаинский р-н, ул. Х.Мамедова, д. 21, кв. 27',
      formTitle: 'Напишите нам',
      name: 'Ваше имя',
      email: 'Ваш e-mail',
      phone: 'Телефон (необязательно)',
      subject: 'Тема (необязательно)',
      message: 'Сообщение',
      send: 'Отправить',
      sending: 'Отправляется…',
      sent: 'Сообщение отправлено. Спасибо, мы скоро ответим.',
      failed: 'Сообщение не отправлено. Попробуйте позже или напишите на info@lider.com.az.',
    },
    footer: {
      about: 'Lider.com.az – независимый новостной портал. Оперативно и беспристрастно освещает политические, экономические, социальные, культурные и спортивные события в Азербайджане и мире.',
      sectionsTitle: 'Разделы',
      siteTitle: 'Lider.com.az',
      siteLinks: [
        { href: '/about.html', label: 'О нас' },
        { href: '/redaksiya.html', label: 'Редакция' },
        { href: '/reklam.html', label: 'Реклама' },
        { href: '/contact.html', label: 'Контакты' },
        { href: '/rss.xml', label: 'RSS' },
      ],
      contactTitle: 'Контакты',
      copyright: 'Все права защищены.',
      citation: 'При использовании материалов сайта ссылка обязательна. При публикации в интернете обязательна гиперссылка на источник.',
      legal: [
        { href: '/istifade-qaydalari.html', label: 'Правила пользования' },
        { href: '/mexfilik-siyaseti.html', label: 'Политика конфиденциальности' },
      ],
    },
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
