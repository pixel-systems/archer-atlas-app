export type Dictionary = {
  nav: {
    members: string;
    clubs: string;
    competitions: string;
    results: string;
    awards: string;
    calendar: string;
    admin: string;
    profile: string;
    signIn: string;
  };
  footer: {
    dataFrom: string;
    notOfficial: string;
  };
  language: {
    label: string;
    sk: string;
    en: string;
  };
  home: {
    eyebrow: string;
    title: string;
    intro: string;
    ctaMembers: string;
    ctaResults: string;
    cards: {
      members: { title: string; desc: string };
      clubs: { title: string; desc: string };
      results: { title: string; desc: string };
      awards: { title: string; desc: string };
    };
    show: string;
  };
  common: {
    search: string;
    searchPlaceholder: string;
    page: string;
    of: string;
    previous: string;
    next: string;
    total: string;
    open: string;
    backToList: string;
    notFound: string;
    loading: string;
    save: string;
    cancel: string;
    delete: string;
  };
  members: {
    title: string;
    subtitle: string;
    headerName: string;
    headerYear: string;
    headerClub: string;
    headerLicense: string;
    headerCategoryTarget: string;
    headerCategory3D: string;
    headerDetail: string;
    detailScraped: string;
    detailMissing: string;
    onPage: string;
    overallEnriched: string;
    empty: string;
    seasonResults: string;
  };
  clubs: {
    title: string;
    subtitle: string;
    members: string;
    rankInClub: string;
    category: string;
    points: string;
  };
  competitions: {
    title: string;
    subtitle: string;
    name: string;
    date: string;
    entries: string;
    athletes: string;
    clubs: string;
    topScore: string;
    disciplines: string;
    season: string;
    filterCategory: string;
    filterDivision: string;
  };
  results: { title: string; subtitle: string };
  awards: { title: string; subtitle: string };
  calendar: {
    title: string;
    subtitle: string;
    openInGoogle: string;
    wkstInfo: string;
    sources: string;
    viewMonth: string;
    viewWeek: string;
    viewAgenda: string;
    openView: string;
    disclaimer: string;
  };
  profile: {
    title: string;
    signOut: string;
    trainingJournal: string;
    license: string;
    role: string;
    claim: string;
  };
  login: {
    title: string;
    subtitle: string;
    google: string;
    facebook: string;
    apple: string;
  };
  admin: {
    title: string;
    scraping: string;
    claims: string;
    runScrape: string;
    cronInfo: string;
    history: string;
    started: string;
    source: string;
    status: string;
    processed: string;
    errors: string;
    progressTitle: string;
    batchInfo: string;
    totalMembers: string;
    withDetail: string;
    withoutDetail: string;
    stale: string;
    estimatedRuns: string;
    membersText: string;
    allFresh: string;
    remainingHint: string;
  };
  training: {
    title: string;
    subtitle: string;
    newSession: string;
    noSessions: string;
  };
};
