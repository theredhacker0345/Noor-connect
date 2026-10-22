export interface Dua {
  id: string;
  category: string;
  arabic: string;
  transliteration: string;
  translation: string;
  reference?: string;
  repeatCount?: number;
  tags?: string[];
}

export const duasData: Dua[] = [
  // Morning Duas
  {
    id: "morning_1",
    category: "Morning",
    arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ",
    transliteration: "Asbahna wa asbahal-mulku lillah walhamdulillah",
    translation: "We have entered a new day and with it all dominion is Allah's, and praise is to Allah",
    reference: "Muslim"
  },
  {
    id: "morning_2",
    category: "Morning",
    arabic: "اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ",
    transliteration: "Allahumma bika asbahna wa bika amsayna wa bika nahya wa bika namutu wa ilaykan-nushur",
    translation: "O Allah, by You we enter the morning and by You we enter the evening, by You we live and by You we die, and to You is the resurrection",
    reference: "Abu Dawud, Tirmidhi"
  },
  {
    id: "morning_3",
    category: "Morning",
    arabic: "أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامِ وَعَلَى كَلِمَةِ الْإِخْلَاصِ",
    transliteration: "Asbahna 'ala fitratil-Islam wa 'ala kalimatil-ikhlas",
    translation: "We rise upon the fitrah of Islam, and upon the word of sincerity",
    reference: "Ahmad"
  },

  // Evening Duas
  {
    id: "evening_1",
    category: "Evening",
    arabic: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ",
    transliteration: "Amsayna wa amsal-mulku lillah",
    translation: "We have entered the evening and with it all dominion is Allah's",
    reference: "Muslim"
  },
  {
    id: "evening_2",
    category: "Evening",
    arabic: "اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ",
    transliteration: "Allahumma inni amsaytu ushhiduka wa ushhidu hamalata 'arshik",
    translation: "O Allah, I have entered the evening and call You to witness and call the bearers of Your Throne to witness",
    reference: "Abu Dawud"
  },
  {
    id: "evening_3",
    category: "Evening",
    arabic: "اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ فَمِنْكَ وَحْدَكَ",
    transliteration: "Allahumma ma amsa bi min ni'matin fa-minka wahdak",
    translation: "O Allah, whatever blessing has come to me this evening is from You alone",
    reference: "Abu Dawud"
  },

  // Travel Duas
  {
    id: "travel_1",
    category: "Travel",
    arabic: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ",
    transliteration: "Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin",
    translation: "Glory be to Him Who has brought this under our control, and we could never have done it by ourselves",
    reference: "Tirmidhi"
  },
  {
    id: "travel_2",
    category: "Travel",
    arabic: "اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى",
    transliteration: "Allahumma inna nas'aluka fi safarina hadhal-birra wat-taqwa",
    translation: "O Allah, we ask You for righteousness and piety on this journey of ours",
    reference: "Tirmidhi"
  },
  {
    id: "travel_3",
    category: "Travel",
    arabic: "اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ وَالْخَلِيفَةُ فِي الْأَهْلِ",
    transliteration: "Allahumma antas-sahibu fis-safari wal-khalifatu fil-ahli",
    translation: "O Allah, You are the Companion on the journey and the Guardian of the family",
    reference: "Muslim"
  },

  // Eating & Drinking
  {
    id: "eating_1",
    category: "Eating",
    arabic: "بِسْمِ اللَّهِ",
    transliteration: "Bismillah",
    translation: "In the name of Allah",
    reference: "Bukhari, Muslim"
  },
  {
    id: "eating_2",
    category: "Eating",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ",
    transliteration: "Alhamdulillahil-ladhi at'amana wa saqana wa ja'alana muslimin",
    translation: "Praise be to Allah Who has given us food and drink and made us Muslims",
    reference: "Abu Dawud, Tirmidhi"
  },

  // Sleeping
  {
    id: "sleeping_1",
    category: "Sleeping",
    arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
    transliteration: "Bismika Allahumma amutu wa ahya",
    translation: "In Your name O Allah, I die and I live",
    reference: "Bukhari"
  },
  {
    id: "sleeping_2",
    category: "Sleeping",
    arabic: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ",
    transliteration: "Allahumma qini 'adhabaka yawma tab'athu 'ibadak",
    translation: "O Allah, protect me from Your punishment on the Day You resurrect Your servants",
    reference: "Abu Dawud"
  },

  // Illness & Healing
  {
    id: "illness_1",
    category: "Illness",
    arabic: "أَذْهِبِ الْبَاسَ رَبَّ النَّاسِ وَاشْفِ أَنْتَ الشَّافِي",
    transliteration: "Adh-hibil-ba'sa rabban-nas washfi antash-shafi",
    translation: "Remove the hardship, O Lord of mankind, and heal, You are the Healer",
    reference: "Bukhari, Muslim"
  },
  {
    id: "illness_2",
    category: "Illness",
    arabic: "اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَأْسَ",
    transliteration: "Allahumma rabban-nasi adhhibil-ba's",
    translation: "O Allah, Lord of mankind, remove the suffering",
    reference: "Bukhari"
  },

  // Anxiety & Distress
  {
    id: "distress_1",
    category: "Distress",
    arabic: "لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ",
    transliteration: "La ilaha illallahul-'Adhimul-Halim",
    translation: "There is no god but Allah, the Magnificent, the Forbearing",
    reference: "Bukhari, Muslim"
  },
  {
    id: "distress_2",
    category: "Distress",
    arabic: "اللَّهُمَّ رَحْمَتَكَ أَرْجُو فَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ",
    transliteration: "Allahumma rahmataka arju fala takilni ila nafsi tarfata 'ayn",
    translation: "O Allah, I hope for Your mercy, so do not leave me to myself even for the blink of an eye",
    reference: "Abu Dawud"
  },

  // Gratitude
  {
    id: "gratitude_1",
    category: "Gratitude",
    arabic: "الْحَمْدُ لِلَّهِ حَمْدًا كَثِيرًا طَيِّبًا مُبَارَكًا فِيهِ",
    transliteration: "Alhamdulillahi hamdan kathiran tayyiban mubarakan fih",
    translation: "All praise is due to Allah, abundant good and blessed praise",
    reference: "Bukhari"
  },
  {
    id: "gratitude_2",
    category: "Gratitude",
    arabic: "اللَّهُمَّ لَكَ الْحَمْدُ كُلُّهُ",
    transliteration: "Allahumma lakal-hamdu kulluh",
    translation: "O Allah, all praise is due to You",
    reference: "Muslim"
  },

  // Forgiveness
  {
    id: "forgiveness_1",
    category: "Forgiveness",
    arabic: "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ",
    transliteration: "Rabbighfir li wa tub 'alayya innaka antat-tawwabur-rahim",
    translation: "My Lord, forgive me and accept my repentance, for You are the Oft-Returning, the Most Merciful",
    reference: "Abu Dawud, Tirmidhi"
  },
  {
    id: "forgiveness_2",
    category: "Forgiveness",
    arabic: "أَسْتَغْفِرُ اللَّهَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ",
    transliteration: "Astaghfirullahallathi la ilaha illa huwal-Hayyul-Qayyumu wa atubu ilayh",
    translation: "I seek forgiveness from Allah, besides Whom there is no god, the Ever-Living, the Sustainer, and I repent to Him",
    reference: "Abu Dawud, Tirmidhi"
  },

  // Protection
  {
    id: "protection_1",
    category: "Protection",
    arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    transliteration: "A'udhu bikalimatillahit-tammati min sharri ma khalaq",
    translation: "I seek refuge in the perfect words of Allah from the evil of what He has created",
    reference: "Muslim"
  },
  {
    id: "protection_2",
    category: "Protection",
    arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ",
    transliteration: "Bismillahil-ladhi la yadurru ma'asmihi shay'un fil-ardi wa la fis-sama'",
    translation: "In the name of Allah, with Whose name nothing can harm on earth or in heaven",
    reference: "Abu Dawud, Tirmidhi"
  },

  // Rain
  {
    id: "rain_1",
    category: "Weather",
    arabic: "اللَّهُمَّ صَيِّبًا نَافِعًا",
    transliteration: "Allahumma sayyiban nafi'a",
    translation: "O Allah, (bring) beneficial rain",
    reference: "Bukhari"
  },

  // After Prayer
  {
    id: "after_prayer_1",
    category: "After Prayer",
    arabic: "أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ",
    transliteration: "Astaghfirullah, Astaghfirullah, Astaghfirullah",
    translation: "I seek Allah's forgiveness (said three times)",
    reference: "Muslim"
  },
  {
    id: "after_prayer_2",
    category: "After Prayer",
    arabic: "اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ",
    transliteration: "Allahumma antas-salamu wa minkas-salamu tabarakta ya dhal-jalali wal-ikram",
    translation: "O Allah, You are Peace and from You comes peace. Blessed are You, O Owner of Majesty and Honor",
    reference: "Muslim"
  },

  // Before Entering Home
  {
    id: "home_1",
    category: "Home",
    arabic: "بِسْمِ اللَّهِ وَلَجْنَا وَبِسْمِ اللَّهِ خَرَجْنَا وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا",
    transliteration: "Bismillahi walajna wa bismillahi kharajna wa 'alallahi rabbina tawakkalna",
    translation: "In the name of Allah we enter, in the name of Allah we leave, and upon Allah our Lord we rely",
    reference: "Abu Dawud"
  },

  // Leaving Home
  {
    id: "leaving_home_1",
    category: "Home",
    arabic: "بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
    transliteration: "Bismillah, tawakkaltu 'alallah, la hawla wa la quwwata illa billah",
    translation: "In the name of Allah, I place my trust in Allah, there is no might nor power except with Allah",
    reference: "Abu Dawud, Tirmidhi"
  },

  // Entering Mosque
  {
    id: "mosque_1",
    category: "Mosque",
    arabic: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
    transliteration: "Allahummaftah li abwaba rahmatik",
    translation: "O Allah, open for me the doors of Your mercy",
    reference: "Muslim"
  },

  // Leaving Mosque
  {
    id: "mosque_2",
    category: "Mosque",
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ",
    transliteration: "Allahumma inni as'aluka min fadlik",
    translation: "O Allah, I ask You from Your bounty",
    reference: "Muslim"
  },

  // Entering Bathroom
  {
    id: "bathroom_1",
    category: "Daily",
    arabic: "بِسْمِ اللَّهِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ",
    transliteration: "Bismillah, Allahumma inni a'udhu bika minal-khubthi wal-khaba'ith",
    translation: "In the name of Allah. O Allah, I seek refuge in You from male and female evil spirits",
    reference: "Bukhari, Muslim"
  },

  // Waking Up
  {
    id: "waking_1",
    category: "Daily",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
    transliteration: "Alhamdulillahil-ladhi ahyana ba'da ma amatana wa ilayhin-nushur",
    translation: "Praise is to Allah Who gave us life after having taken it from us, and unto Him is the resurrection",
    reference: "Bukhari"
  },

  // Wearing Clothes
  {
    id: "clothes_1",
    category: "Daily",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي كَسَانِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ",
    transliteration: "Alhamdulillahil-ladhi kasani hadha wa razaqanihi min ghayri hawlin minni wa la quwwah",
    translation: "Praise is to Allah Who has clothed me with this and provided it for me without any might or power from myself",
    reference: "Abu Dawud, Tirmidhi"
  },

  // Looking in Mirror
  {
    id: "mirror_1",
    category: "Daily",
    arabic: "اللَّهُمَّ كَمَا حَسَّنْتَ خَلْقِي فَحَسِّنْ خُلُقِي",
    transliteration: "Allahumma kama hassanta khalqi fa-hassin khuluqi",
    translation: "O Allah, as You have made my external features beautiful, make my character beautiful as well",
    reference: "Ahmad"
  },

  // Friday
  {
    id: "friday_1",
    category: "Special Days",
    arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ",
    transliteration: "Allahumma salli 'ala Muhammadin wa 'ala ali Muhammad",
    translation: "O Allah, send prayers upon Muhammad and the family of Muhammad",
    reference: "Bukhari, Muslim"
  },

  // Knowledge
  {
    id: "knowledge_1",
    category: "Knowledge",
    arabic: "رَبِّ زِدْنِي عِلْمًا",
    transliteration: "Rabbi zidni 'ilma",
    translation: "My Lord, increase me in knowledge",
    reference: "Quran 20:114"
  },
  {
    id: "knowledge_2",
    category: "Knowledge",
    arabic: "اللَّهُمَّ انْفَعْنِي بِمَا عَلَّمْتَنِي وَعَلِّمْنِي مَا يَنْفَعُنِي",
    transliteration: "Allahumma infa'ni bima 'allamtani wa 'allimni ma yanfa'uni",
    translation: "O Allah, benefit me with what You have taught me, and teach me what will benefit me",
    reference: "Ibn Majah"
  },

  // Patience
  {
    id: "patience_1",
    category: "Character",
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ",
    transliteration: "Allahumma inni a'udhu bika minal-'ajzi wal-kasal",
    translation: "O Allah, I seek refuge in You from incapacity and laziness",
    reference: "Bukhari, Muslim"
  },

  // Marriage
  {
    id: "marriage_1",
    category: "Marriage",
    arabic: "بَارَكَ اللَّهُ لَكَ وَبَارَكَ عَلَيْكَ وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ",
    translation: "May Allah bless you, and shower His blessings upon you, and join you together in goodness",
    transliteration: "Barakallahu laka wa baraka 'alayka wa jama'a baynakuma fi khayr",
    reference: "Abu Dawud, Tirmidhi"
  },

  // Children
  {
    id: "children_1",
    category: "Family",
    arabic: "رَبِّ هَبْ لِي مِنْ لَدُنْكَ ذُرِّيَّةً طَيِّبَةً",
    transliteration: "Rabbi hab li min ladunka dhurriyyatan tayyibah",
    translation: "My Lord, grant me from Yourself a good offspring",
    reference: "Quran 3:38"
  },

  // Debt
  {
    id: "debt_1",
    category: "Financial",
    arabic: "اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ",
    transliteration: "Allahummakfini bihalalika 'an haramika wa aghnini bifadlika 'amman siwak",
    translation: "O Allah, make what is lawful enough for me, as opposed to what is unlawful, and spare me by Your grace, of need of others",
    reference: "Tirmidhi"
  },

  // Anger
  {
    id: "anger_1",
    category: "Character",
    arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ",
    transliteration: "A'udhu billahi minash-shaytanir-rajim",
    translation: "I seek refuge with Allah from Satan, the accursed",
    reference: "Bukhari, Muslim"
  },

  // Paradise
  {
    id: "paradise_1",
    category: "Afterlife",
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْجَنَّةَ وَأَعُوذُ بِكَ مِنَ النَّارِ",
    transliteration: "Allahumma inni as'alukal-jannata wa a'udhu bika minan-nar",
    translation: "O Allah, I ask You for Paradise and seek refuge in You from the Fire",
    reference: "Abu Dawud"
  },
  
  // ===== Additional Morning Duas =====
  {
    id: "morning_4",
    category: "Morning",
    arabic: "اللَّهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ وَمَلَائِكَتَكَ وَجَمِيعَ خَلْقِكَ أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ",
    transliteration: "Allahumma inni asbahtu ushhiduka wa ushhidu hamalata 'arshika wa mala'ikataka wa jami'a khalqika annaka antallahu la ilaha illa anta wa anna Muhammadan 'abduka wa rasuluk",
    translation: "O Allah, I have entered the morning calling You to witness, and the bearers of Your Throne, Your angels, and all of Your creation that You are Allah, there is no god but You, and Muhammad is Your servant and Messenger",
    reference: "Abu Dawud"
  },
  {
    id: "morning_5",
    category: "Morning",
    arabic: "اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ",
    transliteration: "Allahumma ma asbaha bi min ni'matin fa-minka wahdaka la sharika laka falakal-hamdu wa lakash-shukr",
    translation: "O Allah, whatever blessing has come to me this morning is from You alone, no partner has You, so to You is all praise and to You is all thanks",
    reference: "Abu Dawud, Nasa'i"
  },
  {
    id: "morning_6",
    category: "Morning",
    arabic: "رَضِيتُ بِاللَّهِ رَبًّا وَبِالْإِسْلَامِ دِينًا وَبِمُحَمَّدٍ نَبِيًّا",
    transliteration: "Raditu billahi rabban wa bil-islami dinan wa bi Muhammadin nabiyya",
    translation: "I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad as my Prophet",
    reference: "Abu Dawud, Tirmidhi",
    repeatCount: 3
  },

  // ===== Additional Evening Duas =====
  {
    id: "evening_4",
    category: "Evening",
    arabic: "اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ",
    transliteration: "Allahumma bika amsayna wa bika asbahna wa bika nahya wa bika namutu wa ilaykal-masir",
    translation: "O Allah, by You we enter the evening and by You we enter the morning, by You we live and by You we die, and to You is the final return",
    reference: "Abu Dawud, Tirmidhi"
  },
  {
    id: "evening_5",
    category: "Evening",
    arabic: "اللَّهُمَّ إِنِّي أَمْسَيْتُ أَشْهَدُكَ وَأَشْهَدُ حَمَلَةَ عَرْشِكَ وَمَلَائِكَتَكَ وَجَمِيعَ خَلْقِكَ أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ",
    transliteration: "Allahumma inni amsaytu ash-haduka wa ash-hadu hamalata 'arshika wa mala'ikataka wa jami'a khalqika annaka antallahu la ilaha illa anta wa anna Muhammadan 'abduka wa rasuluk",
    translation: "O Allah, I enter the evening bearing witness that You are Allah and Muhammad is Your Messenger",
    reference: "Abu Dawud"
  },
  {
    id: "evening_6",
    category: "Evening",
    arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    transliteration: "A'udhu bikalimatillahit-tammati min sharri ma khalaq",
    translation: "I seek refuge in the perfect words of Allah from the evil of what He has created",
    reference: "Muslim",
    repeatCount: 3
  },

  // ===== Additional Sleeping Duas =====
  {
    id: "sleeping_3",
    category: "Sleeping",
    arabic: "بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي وَبِكَ أَرْفَعُهُ فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ",
    transliteration: "Bismika Rabbi wada'tu jambi wa bika arfa'uhu fa-in amsakta nafsi farhamha wa in arsaltaha fahfazha bima tahfazu bihi 'ibadakas-salihin",
    translation: "In Your name my Lord, I lay my side down and by You I raise it. If You take my soul, have mercy on it. If You send it back, protect it as You protect Your righteous servants",
    reference: "Bukhari, Muslim"
  },
  {
    id: "sleeping_4",
    category: "Sleeping",
    arabic: "اللَّهُمَّ إِنَّكَ خَلَقْتَ نَفْسِي وَأَنْتَ تَوَفَّاهَا لَكَ مَمَاتُهَا وَمَحْيَاهَا إِنْ أَحْيَيْتَهَا فَاحْفَظْهَا وَإِنْ أَمَتَّهَا فَاغْفِرْ لَهَا",
    transliteration: "Allahumma innaka khalaqta nafsi wa anta tawaffaha laka mamat uha wa mahyaha in ahyaytaha fahfazha wa in amattaha faghfir laha",
    translation: "O Allah, You created my soul and You take it back. To You belong its death and its life. If You keep it alive, protect it. If You cause it to die, forgive it",
    reference: "Muslim"
  },
  {
    id: "sleeping_5",
    category: "Sleeping",
    arabic: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ",
    transliteration: "Allahumma qini 'adhabaka yawma tab'athu 'ibadak",
    translation: "O Allah, protect me from Your punishment on the Day You resurrect Your servants",
    reference: "Abu Dawud",
    repeatCount: 3
  },
  {
    id: "sleeping_6",
    category: "Sleeping",
    arabic: "سُبْحَانَ اللَّهِ ثَلَاثًا وَثَلَاثِينَ وَالْحَمْدُ لِلَّهِ ثَلَاثًا وَثَلَاثِينَ وَاللَّهُ أَكْبَرُ ثَلَاثًا وَثَلَاثِينَ",
    transliteration: "SubhanAllah 33x, Alhamdulillah 33x, Allahu Akbar 34x",
    translation: "Glory be to Allah (33 times), Praise be to Allah (33 times), Allah is the Greatest (34 times) — completes 100",
    reference: "Bukhari, Muslim",
    repeatCount: 100
  },

  // ===== Repentance (Tawbah) =====
  {
    id: "tawbah_1",
    category: "Repentance",
    arabic: "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيَّ الْقَيُّومَ وَأَتُوبُ إِلَيْهِ",
    transliteration: "Astaghfirullahal-'adhim alladhi la ilaha illa huwal-Hayyul-Qayyuma wa atubu ilayh",
    translation: "I seek forgiveness from Allah the Almighty, besides Whom there is no god, the Ever-Living, the Self-Sustaining, and I repent to Him",
    reference: "Abu Dawud, Tirmidhi",
    repeatCount: 3
  },
  {
    id: "tawbah_2",
    category: "Repentance",
    arabic: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
    transliteration: "Allahumma anta Rabbi la ilaha illa anta khalaqtani wa ana 'abduka wa ana 'ala 'ahdika wa wa'dika mastata'tu a'udhu bika min sharri ma sana'tu abu'u laka bini'matika 'alayya wa abu'u bidhanbi faghfir li fa-innahu la yaghfirudh-dhunuba illa ant",
    translation: "O Allah, You are my Lord, there is no god but You. You created me and I am Your servant. I am upon Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your blessings upon me and I confess my sins, so forgive me, for none forgives sins but You",
    reference: "Bukhari 6306",
    tags: ["sayyidul-istighfar"]
  },
  {
    id: "tawbah_3",
    category: "Repentance",
    arabic: "رَبَّنَا ظَلَمْنَا أَنْفُسَنَا وَإِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ",
    transliteration: "Rabbana zalamna anfusana wa in lam taghfir lana wa tarhamna lanakunanna minal-khasirin",
    translation: "Our Lord, we have wronged ourselves, and if You do not forgive us and have mercy on us, we will surely be among the losers",
    reference: "Quran 7:23"
  },

  // ===== Parents =====
  {
    id: "parents_1",
    category: "Parents",
    arabic: "رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
    transliteration: "Rabbirhamhuma kama rabbayani saghira",
    translation: "My Lord, have mercy on them (my parents) as they raised me when I was small",
    reference: "Quran 17:24"
  },
  {
    id: "parents_2",
    category: "Parents",
    arabic: "رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ",
    transliteration: "Rabbighfir li wa liwalidayya wa lil-mu'minina yawma yaqumul-hisab",
    translation: "My Lord, forgive me and my parents and the believers on the Day the account is established",
    reference: "Quran 14:41"
  },

  // ===== Gratitude (additional) =====
  {
    id: "gratitude_3",
    category: "Gratitude",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي بِنِعْمَتِهِ تَتِمُّ الصَّالِحَاتُ",
    transliteration: "Alhamdulillahil-ladhi bini'matihi tatimmus-salihat",
    translation: "All praise is due to Allah, by whose grace good deeds are completed",
    reference: "Ibn Majah"
  },
  {
    id: "gratitude_4",
    category: "Gratitude",
    arabic: "رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ وَعَلَى وَالِدَيَّ وَأَنْ أَعْمَلَ صَالِحًا تَرْضَاهُ",
    transliteration: "Rabbi awzi'ni an ashkura ni'matakallati an'amta 'alayya wa 'ala walidayya wa an a'mala salihan tardah",
    translation: "My Lord, enable me to be grateful for Your favor which You have bestowed upon me and upon my parents, and to do righteous deeds that please You",
    reference: "Quran 46:15"
  },

  // ===== Distress & Anxiety (additional) =====
  {
    id: "distress_3",
    category: "Distress",
    arabic: "لَا إِلَهَ إِلَّا اللَّهُ الْحَلِيمُ الْكَرِيمُ سُبْحَانَ اللَّهِ رَبِّ الْعَرْشِ الْعَظِيمِ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
    transliteration: "La ilaha illallahul-Halimul-Karim, SubhanAllahi Rabbil-'arshil-'adhim, Alhamdulillahi Rabbil-'alamin",
    translation: "There is no god but Allah, the Forbearing, the Generous. Glory be to Allah, Lord of the Great Throne. Praise be to Allah, Lord of the worlds",
    reference: "Ibn Majah"
  },
  {
    id: "distress_4",
    category: "Distress",
    arabic: "اللَّهُمَّ رَحْمَتَكَ أَرْجُو فَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ وَأَصْلِحْ لِي شَأْنِي كُلَّهُ لَا إِلَهَ إِلَّا أَنْتَ",
    transliteration: "Allahumma rahmataka arju fala takilni ila nafsi tarfata 'aynin wa aslih li sha'ni kullahu la ilaha illa ant",
    translation: "O Allah, I hope for Your mercy, so do not entrust me to myself even for a blink of an eye. Rectify all my affairs. There is no god but You",
    reference: "Abu Dawud"
  },
  {
    id: "distress_5",
    category: "Distress",
    arabic: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
    transliteration: "La ilaha illa anta subhanaka inni kuntu minaz-zalimin",
    translation: "There is no god but You, glory be to You, indeed I have been among the wrongdoers",
    reference: "Quran 21:87",
    tags: ["younis", "dua-of-prophet-yunus"]
  },

  // ===== After Prayer (additional) =====
  {
    id: "after_prayer_3",
    category: "After Prayer",
    arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ وَلَا مُعْطِيَ لِمَا مَنَعْتَ وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ",
    transliteration: "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa huwa 'ala kulli shay'in qadir. Allahumma la mani'a lima a'tayta wa la mu'tiya lima mana'ta wa la yanfa'u dhal-jaddi minkal-jadd",
    translation: "There is no god but Allah, alone, no partner has He. His is the sovereignty and His is the praise, and He is over all things capable. O Allah, none can withhold what You give, and none can give what You withhold, and no wealth can benefit anyone against You",
    reference: "Bukhari, Muslim"
  },
  {
    id: "after_prayer_4",
    category: "After Prayer",
    arabic: "سُبْحَانَ اللَّهِ ثَلَاثًا وَثَلَاثِينَ وَالْحَمْدُ لِلَّهِ ثَلَاثًا وَثَلَاثِينَ وَاللَّهُ أَكْبَرُ ثَلَاثًا وَثَلَاثِينَ ثُمَّ قَالَ: لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    transliteration: "SubhanAllah 33x, Alhamdulillah 33x, Allahu Akbar 33x, then La ilaha illallahu wahdahu la sharika lah...",
    translation: "Glory be to Allah (33), Praise be to Allah (33), Allah is Greatest (33), then the declaration of faith completes 100",
    reference: "Muslim",
    repeatCount: 100,
    tags: ["tasbeeh", "after-prayer"]
  },

  // ===== Protection (additional) =====
  {
    id: "protection_3",
    category: "Protection",
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ وَالْعَجْزِ وَالْكَسَلِ وَالْبُخْلِ وَالْجُبْنِ وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ",
    transliteration: "Allahumma inni a'udhu bika minal-hammi wal-hazani wal-'ajzi wal-kasali wal-bukhli wal-jubni wa dhala'id-dayni wa ghalabatir-rijal",
    translation: "O Allah, I seek refuge in You from anxiety and sorrow, weakness and laziness, miserliness and cowardice, the burden of debts and from being overpowered by men",
    reference: "Bukhari"
  },
  {
    id: "protection_4",
    category: "Protection",
    arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
    transliteration: "Bismillahil-ladhi la yadurru ma'asmihi shay'un fil-ardi wa la fis-sama'i wa huwas-Sami'ul-'Alim",
    translation: "In the name of Allah, with Whose name nothing can harm on earth or in heaven, and He is the All-Hearing, the All-Knowing",
    reference: "Abu Dawud, Tirmidhi, Ibn Majah",
    repeatCount: 3
  },

  // ===== Fasting & Ramadan =====
  {
    id: "fasting_1",
    category: "Fasting",
    arabic: "اللَّهُمَّ إِنِّي لَكَ صُمْتُ وَبِكَ آمَنْتُ وَعَلَيْكَ تَوَكَّلْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ",
    transliteration: "Allahumma inni laka sumtu wa bika amantu wa 'alayka tawakkaltu wa 'ala rizqika aftartu",
    translation: "O Allah, I have fasted for You, I believe in You, I rely on You, and with Your provision I break my fast",
    reference: "Abu Dawud"
  },
  {
    id: "fasting_2",
    category: "Fasting",
    arabic: "ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ",
    transliteration: "Dhahabaz-zama'u wabtallatil-'uruqu wa thabatal-ajru insha-Allah",
    translation: "The thirst is gone, the veins are moistened, and the reward is confirmed, if Allah wills",
    reference: "Abu Dawud"
  },

  // ===== Hajj & Umrah =====
  {
    id: "hajj_1",
    category: "Hajj & Umrah",
    arabic: "لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ لَا شَرِيكَ لَكَ",
    transliteration: "Labbayka Allahumma labbayk, labbayka la sharika laka labbayk, innal-hamda wan-ni'mata laka wal-mulk, la sharika lak",
    translation: "Here I am, O Allah, here I am. Here I am, no partner has You, here I am. Indeed all praise, grace, and sovereignty are Yours. No partner has You",
    reference: "Bukhari, Muslim"
  },
  {
    id: "hajj_2",
    category: "Hajj & Umrah",
    arabic: "اللَّهُمَّ اجْعَلْهُ حَجًّا مَبْرُورًا وَذَنْبًا مَغْفُورًا وَسَعْيًا مَشْكُورًا",
    transliteration: "Allahummaj'alhu hajjan mabruraw wa dhanbam maghfooraw wa sa'yam mashkoora",
    translation: "O Allah, make it an accepted Hajj, a forgiven sin, and a praiseworthy effort",
    reference: "Ahmad"
  },

  // ===== New Moon =====
  {
    id: "moon_1",
    category: "New Moon",
    arabic: "اللَّهُ أَكْبَرُ اللَّهُمَّ أَهِلَّهُ عَلَيْنَا بِالْأَمْنِ وَالْإِيمَانِ وَالسَّلَامَةِ وَالْإِسْلَامِ وَالتَّوْفِيقِ لِمَا تُحِبُّ وَتَرْضَى رَبُّنَا وَرَبُّكَ اللَّهُ",
    transliteration: "Allahu Akbar, Allahumma ahillahu 'alayna bil-amni wal-imani was-salamati wal-Islami wat-tawfiqi lima tuhibbu wa tarda. Rabbuna wa rabbukallah",
    translation: "Allah is Greatest. O Allah, bring this new moon upon us with security, faith, safety, Islam, and success in what You love and are pleased with. Our Lord and your Lord is Allah",
    reference: "Tirmidhi, Darimi"
  },

  // ===== Sickness & Visiting the Sick =====
  {
    id: "sick_visit_1",
    category: "Illness",
    arabic: "لَا بَأْسَ طَهُورٌ إِنْ شَاءَ اللَّهُ",
    transliteration: "La ba'sa tahurun insha-Allah",
    translation: "No worry, it is a purification, if Allah wills",
    reference: "Bukhari",
    tags: ["visiting-sick"]
  },
  {
    id: "sick_visit_2",
    category: "Illness",
    arabic: "أَسْأَلُ اللَّهَ الْعَظِيمَ رَبَّ الْعَرْشِ الْعَظِيمِ أَنْ يَشْفِيَكَ",
    transliteration: "As'alullahal-'adhim Rabbal-'arshil-'adhim an yashfiyak",
    translation: "I ask Allah the Almighty, Lord of the Great Throne, to cure you",
    reference: "Tirmidhi, Abu Dawud",
    repeatCount: 7,
    tags: ["visiting-sick"]
  },

  // ===== Journey & Travel (additional) =====
  {
    id: "travel_return_1",
    category: "Travel",
    arabic: "آيِبُونَ تَائِبُونَ عَابِدُونَ لِرَبِّنَا حَامِدُونَ",
    transliteration: "Ayibuna ta'ibuna 'abiduna lirabbina hamidun",
    translation: "Returning, repenting, worshipping, and praising our Lord",
    reference: "Bukhari, Muslim"
  },

  // ===== Sneeze =====
  {
    id: "sneeze_1",
    category: "Daily",
    arabic: "الْحَمْدُ لِلَّهِ",
    transliteration: "Alhamdulillah",
    translation: "Praise be to Allah (said after sneezing)",
    reference: "Bukhari"
  },
  {
    id: "sneeze_2",
    category: "Daily",
    arabic: "يَرْحَمُكَ اللَّهُ",
    transliteration: "Yarhamukallah",
    translation: "May Allah have mercy on you (said to one who sneezes and praises Allah)",
    reference: "Bukhari"
  },

  // ===== Entering Market =====
  {
    id: "market_1",
    category: "Daily",
    arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ حَيٌّ لَا يَمُوتُ بِيَدِهِ الْخَيْرُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    transliteration: "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu yuhyi wa yumitu wa huwa hayyun la yamutu biyadihil-khayru wa huwa 'ala kulli shay'in qadir",
    translation: "There is no god but Allah, alone with no partner. His is the dominion and His is the praise. He gives life and causes death, and He is Living and does not die. In His hand is all good, and He is over all things capable",
    reference: "Tirmidhi, Ibn Majah"
  },

  // ===== New Clothes =====
  {
    id: "clothes_new_1",
    category: "Daily",
    arabic: "اللَّهُمَّ لَكَ الْحَمْدُ أَنْتَ كَسَوْتَنِيهِ أَسْأَلُكَ مِنْ خَيْرِهِ وَخَيْرِ مَا صُنِعَ لَهُ وَأَعُوذُ بِكَ مِنْ شَرِّهِ وَشَرِّ مَا صُنِعَ لَهُ",
    transliteration: "Allahumma lakal-hamdu anta kasawtanihi as'aluka min khayrihi wa khayri ma suni'a lahu wa a'udhu bika min sharrihi wa sharri ma suni'a lah",
    translation: "O Allah, to You be all praise. You have clothed me with this. I ask You for its goodness and the goodness of what it was made for, and I seek refuge in You from its evil and the evil of what it was made for",
    reference: "Abu Dawud, Tirmidhi"
  },

  // ===== Protection of Children =====
  {
    id: "children_protect_1",
    category: "Family",
    arabic: "أُعِيذُكُمَا بِكَلِمَاتِ اللَّهِ التَّامَّةِ مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ",
    transliteration: "U'idhukuma bikalimatillahit-tammati min kulli shaytanin wa hammatin wa min kulli 'aynin lammah",
    translation: "I seek protection for both of you in the perfect words of Allah from every devil, every poisonous creature, and every evil eye",
    reference: "Bukhari"
  },

  // ===== Additional Forgiveness Duas =====
  {
    id: "forgiveness_3",
    category: "Forgiveness",
    arabic: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
    transliteration: "Astaghfirullaha wa atubu ilayh",
    translation: "I seek forgiveness from Allah and I repent to Him (the Prophet ﷺ said it more than seventy times a day)",
    reference: "Bukhari 6307"
  },
  {
    id: "forgiveness_4",
    category: "Forgiveness",
    arabic: "رَبَّنَا لَا تُؤَاخِذْنَا إِنْ نَسِينَا أَوْ أَخْطَأْنَا رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِنْ قَبْلِنَا رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا أَنْتَ مَوْلَانَا فَانْصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ",
    transliteration: "Rabbana la tu'akhidhna in nasina aw akhta'na, rabbana wa la tahmil 'alayna isran ka-hamalahu 'alal-ladhina min qablina, rabbana wa la tuhammilna ma la taqata lana bih, wa'fu 'anna waghfir lana warhamna anta maulana fansurna 'alal-qawmil-kafirin",
    translation: "Our Lord, do not take us to task if we forget or err. Our Lord, do not burden us with a burden as You burdened those before us. Our Lord, do not burden us with what we cannot bear. Pardon us, forgive us, and have mercy on us. You are our Protector, so help us against the disbelieving people",
    reference: "Quran 2:286"
  },
  {
    id: "forgiveness_5",
    category: "Forgiveness",
    arabic: "رَبَّنَا اغْفِرْ لَنَا ذُنُوبَنَا وَإِسْرَافَنَا فِي أَمْرِنَا وَثَبِّتْ أَقْدَامَنَا وَانْصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ",
    transliteration: "Rabbana-ghfir lana dhunubana wa israfana fi amrina wa thabbit aqdamana wansurna 'alal-qawmil-kafirin",
    translation: "Our Lord, forgive us our sins and our excesses in our affairs, make our feet firm, and grant us victory over the disbelieving people",
    reference: "Quran 3:147"
  },
  {
    id: "forgiveness_6",
    category: "Forgiveness",
    arabic: "اللَّهُمَّ اغْفِرْ لِي ذَنْبِي كُلَّهُ، دِقَّهُ وَجِلَّهُ، وَأَوَّلَهُ وَآخِرَهُ، وَعَلَانِيَتَهُ وَسِرَّهُ",
    transliteration: "Allahummaghfir li dhanbi kullahu, diqqahu wa jillahu, wa awwalahu wa akhirahu, wa 'alaniyatahu wa sirrah",
    translation: "O Allah, forgive me all my sins, the small and the great, the first and the last, the open and the hidden",
    reference: "Muslim 483"
  },
  {
    id: "forgiveness_7",
    category: "Forgiveness",
    arabic: "اللَّهُمَّ إِنِّي ظَلَمْتُ نَفْسِي ظُلْمًا كَثِيرًا، وَلَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ، فَاغْفِرْ لِي مَغْفِرَةً مِنْ عِنْدِكَ، وَارْحَمْنِي، إِنَّكَ أَنْتَ الْغَفُورُ الرَّحِيمُ",
    transliteration: "Allahumma inni zalamtu nafsi zulman kathira, wa la yaghfirudh-dhunuba illa anta, faghfir li maghfiratan min 'indika, warhamni, innaka antal-Ghafurur-Rahim",
    translation: "O Allah, I have wronged myself greatly, and none forgives sins but You, so grant me forgiveness from Yourself and have mercy on me, for You are the Oft-Forgiving, the Most Merciful",
    reference: "Bukhari 834, Muslim 2705"
  },
  {
    id: "forgiveness_8",
    category: "Forgiveness",
    arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    transliteration: "Subhanallahi wa bihamdih",
    translation: "Glory be to Allah and praise be to Him (whoever says it a hundred times a day, his sins are forgiven even if they are like the foam of the sea)",
    reference: "Bukhari 6405",
    repeatCount: 100
  },
  {
    id: "forgiveness_9",
    category: "Forgiveness",
    arabic: "رَبَّنَا اغْفِرْ لَنَا ذُنُوبَنَا وَكَفِّرْ عَنَّا سَيِّئَاتِنَا وَتَوَفَّنَا مَعَ الْأَبْرَارِ",
    transliteration: "Rabbana-ghfir lana dhunubana wa kaffir 'annana sayyi'atina wa tawaffana ma'al-abrar",
    translation: "Our Lord, forgive us our sins and efface our bad deeds, and take us in death with the righteous",
    reference: "Quran 3:193"
  },
  {
    id: "forgiveness_10",
    category: "Forgiveness",
    arabic: "اللَّهُمَّ اغْفِرْ لِي مَا قَدَّمْتُ وَمَا أَخَّرْتُ، وَمَا أَسْرَرْتُ وَمَا أَعْلَنْتُ، وَمَا أَسْرَفْتُ، وَمَا أَنْتَ أَعْلَمُ بِهِ مِنِّي، أَنْتَ الْمُقَدِّمُ وَأَنْتَ الْمُؤَخِّرُ، لَا إِلَهَ إِلَّا أَنْتَ",
    transliteration: "Allahummaghfir li ma qaddamtu wa ma akhkhartu, wa ma asrartu wa ma a'lantu, wa ma asraftu, wa ma anta a'lamu bihi minni. Antal-muqaddimu wa antal-mu'akhkhiru, la ilaha illa anta",
    translation: "O Allah, forgive me what I have sent ahead and what I have delayed, what I have concealed and what I have revealed, what I have been excessive in, and what You know better than me. You are the One who puts forward and the One who puts back, there is no god but You",
    reference: "Bukhari 6398, Muslim 604"
  },

  // ===== Additional Protection Duas =====
  {
    id: "protection_5",
    category: "Protection",
    arabic: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَؤُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ",
    transliteration: "Allahu la ilaha illa huwal-Hayyul-Qayyum, la ta'khudhuhu sinatun wa la nawm, lahu ma fis-samawati wa ma fil-ard, man dhal-ladhi yashfa'u 'indahu illa bi-idhnihi, ya'lamu ma bayna aydihim wa ma khalfahum, wa la yuhituna bi shay'in min 'ilmihi illa bima sha', wasi'a kursiyyuhus-samawati wal-ard, wa la ya'uduhu hifzuhuma, wa huwal-'Aliyyul-'Adhim",
    translation: "Allah, there is no god but He, the Ever-Living, the Sustainer. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and the earth. Who can intercede with Him except by His permission? He knows what is before them and what is behind them, and they encompass nothing of His knowledge except what He wills. His Throne extends over the heavens and the earth, and their preservation does not tire Him. He is the Most High, the Most Great (whoever recites it is protected from harm until morning)",
    reference: "Quran 2:255, Bukhari 2311",
    tags: ["ayat-al-kursi", "morning-evening"]
  },
  {
    id: "protection_6",
    category: "Protection",
    arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ، اللَّهُ الصَّمَدُ، لَمْ يَلِدْ وَلَمْ يُولَدْ، وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ",
    transliteration: "Qul huwallahu ahad, Allahus-samad, lam yalid wa lam yulad, wa lam yakul-lahu kufuwan ahad",
    translation: "Say: He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is born, nor is there to Him any equivalent",
    reference: "Bukhari 5017",
    repeatCount: 3,
    tags: ["muawwidhat", "morning-evening"]
  },
  {
    id: "protection_7",
    category: "Protection",
    arabic: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ، مِنْ شَرِّ مَا خَلَقَ، وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ، وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ، وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ",
    transliteration: "Qul a'udhu birabbil-falaq, min sharri ma khalaq, wa min sharri ghasiqin idha waqab, wa min sharrin-naffathati fil-'uqad, wa min sharri hasidin idha hasad",
    translation: "Say: I seek refuge in the Lord of daybreak, from the evil of what He created, and from the evil of darkness when it settles, and from the evil of those who blow on knots, and from the evil of an envier when he envies",
    reference: "Bukhari 5017",
    repeatCount: 3,
    tags: ["muawwidhat", "morning-evening"]
  },
  {
    id: "protection_8",
    category: "Protection",
    arabic: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ، مَلِكِ النَّاسِ، إِلَهِ النَّاسِ، مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ، الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ، مِنَ الْجِنَّةِ وَالنَّاسِ",
    transliteration: "Qul a'udhu birabbin-nas, malikin-nas, ilahin-nas, min sharril-waswasil-khannas, alladhi yuwaswisu fi sudurin-nas, minal-jinnati wan-nas",
    translation: "Say: I seek refuge in the Lord of mankind, the King of mankind, the God of mankind, from the evil of the retreating whisperer, who whispers in the breasts of mankind, from among jinn and mankind",
    reference: "Bukhari 5017",
    repeatCount: 3,
    tags: ["muawwidhat", "morning-evening"]
  },
  {
    id: "protection_9",
    category: "Protection",
    arabic: "اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ، فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي، وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ، وَأَنْ أَقْتَرِفَ عَلَى نَفْسِي سُوءًا أَوْ أَجُرَّهُ إِلَى مُسْلِمٍ",
    transliteration: "Allahumma 'alimal-ghaybi wash-shahadah, fatiras-samawati wal-ard, rabba kulli shay'in wa malikahu, ashhadu an la ilaha illa anta, a'udhu bika min sharri nafsi, wa min sharrish-shaytani wa shirkihi, wa an aqtarifa 'ala nafsi su'an aw ajurrahu ila muslim",
    translation: "O Allah, Knower of the unseen and the seen, Creator of the heavens and the earth, Lord and Sovereign of all things, I bear witness that there is no god but You. I seek refuge in You from the evil of my soul, from the evil of Satan and his call (to associate partners with Allah), and from committing wrong against myself or bringing it upon another Muslim",
    reference: "Tirmidhi, Abu Dawud",
    tags: ["morning-evening"]
  },
  {
    id: "protection_10",
    category: "Protection",
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ وَمِنْ خَلْفِي وَعَنْ يَمِينِي وَعَنْ شِمَالِي وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي",
    transliteration: "Allahumma inni as'alukal-'afwa wal-'afiyah fid-dunya wal-akhirah, Allahumma inni as'alukal-'afwa wal-'afiyah fi dini wa dunyaya wa ahli wa mali, Allahummastur 'awrati wa amin raw'ati, Allahummahfazhni min bayni yadayya wa min khalfi wa 'an yamini wa 'an shimali wa min fawqi, wa a'udhu bi 'azamatika an ughtala min tahti",
    translation: "O Allah, I ask You for pardon and well-being in this world and the Hereafter. O Allah, I ask You for pardon and well-being in my religion, my worldly affairs, my family, and my wealth. O Allah, conceal my faults and calm my fears. O Allah, guard me from in front of me, behind me, on my right, on my left, and above me, and I seek refuge in Your greatness from being seized from beneath me",
    reference: "Abu Dawud, Ibn Majah",
    tags: ["morning-evening"]
  },
  {
    id: "protection_11",
    category: "Protection",
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْبَرَصِ وَالْجُنُونِ وَالْجُذَامِ وَسَيِّئِ الْأَسْقَامِ",
    transliteration: "Allahumma inni a'udhu bika minal-barasi wal-jununi wal-judhami wa sayyidil-asqam",
    translation: "O Allah, I seek refuge in You from leprosy, madness, elephantiasis, and the worst of diseases",
    reference: "Abu Dawud 1555"
  },

  // ===== Additional Parents Duas =====
  {
    id: "parents_3",
    category: "Parents",
    arabic: "رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِمَنْ دَخَلَ بَيْتِيَ مُؤْمِنًا وَالْمُؤْمِنِينَ وَالْمُؤْمِنَاتِ",
    transliteration: "Rabbighfir li wa liwalidayya wa liman dakhala baytiya mu'minan wal-mu'minina wal-mu'minat",
    translation: "My Lord, forgive me and my parents and whoever enters my house as a believer, and the believing men and women",
    reference: "Quran 71:28"
  },
  {
    id: "parents_4",
    category: "Parents",
    arabic: "اللَّهُمَّ اغْفِرْ لَهَا وَارْحَمْهَا وَعَافِهَا وَاعْفُ عَنْهَا، وَأَكْرِمْ مُنْزَلَهَا، وَوَسِّعْ مُدْخَلَهَا، وَاغْسِلْهَا بِالْمَاءِ وَالثَّلْجِ وَالْبَرَدِ، وَنَقِّهَا مِنَ الْخَطَايَا كَمَا نَقَّيْتَ الثَّوْبَ الْأَبْيَضَ مِنَ الدَّنَسِ، وَأَبْدِلْهَا دَارًا خَيْرًا مِنْ دَارِهَا، وَأَهْلًا خَيْرًا مِنْ أَهْلِهَا، وَزَوْجًا خَيْرًا مِنْ زَوْجِهَا، وَأَدْخِلْهَا الْجَنَّةَ، وَأَعِذْهَا مِنْ عَذَابِ الْقَبْرِ وَمِنْ عَذَابِ النَّارِ",
    transliteration: "Allahummaghfir laha warhamha wa 'afiha wa'fu 'anha, wa akrim munzalaha, wa wassi' mudkhalaha, waghsilhal-bil-ma'i wath-thalji wal-barad, wa naqqiha minal-khataya kama naqqaytath-thawbal-abyada minad-danas, wa abdilhaa daran khayran min dariha, wa ahlan khayran min ahliha, wa zawjan khayran min zawjiha, wa adkhilhul-jannah, wa a'idhha min 'adhabil-qabri wa min 'adhabin-nar",
    translation: "O Allah, forgive her, have mercy on her, grant her well-being, and pardon her. Honor her resting place, make her entrance spacious, wash her with water, snow, and hail, cleanse her from sins as a white garment is cleansed of dirt, replace her home with a better home, her family with a better family, and her spouse with a better spouse, admit her to Paradise, and protect her from the punishment of the grave and the punishment of the Fire",
    reference: "Muslim 963",
    tags: ["deceased-parent", "funeral"]
  },
  {
    id: "parents_5",
    category: "Parents",
    arabic: "السَّلَامُ عَلَيْنَا أَهْلَ الدِّيَارِ مِنَ الْمُؤْمِنِينَ وَالْمُسْلِمِينَ، وَإِنَّا إِنْ شَاءَ اللَّهُ بِكُمْ لَاحِقُونَ، يَرْحَمُ اللَّهُ الِاسْتَقْدِمِينَ مِنَّا وَالِاسْتَأْخِرِينَ",
    transliteration: "Assalamu 'alayna ahlad-diyari minal-mu'minina wal-muslimin, wa inna insha-Allahu bikum lahiqun, yarhamullahal-istaqdimina minnal-istakhirin",
    translation: "Peace be upon you, O inhabitants of these graves, from the believing men and women. Indeed, if Allah wills, we will join you. May Allah have mercy on those of us who went ahead and those who will follow",
    reference: "Muslim 975",
    tags: ["visiting-graves"]
  },

  // ===== Additional Knowledge Duas =====
  {
    id: "knowledge_3",
    category: "Knowledge",
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا",
    transliteration: "Allahumma inni as'aluka 'ilman nafi'a, wa rizqan tayyiba, wa 'amalan mutaqabbala",
    translation: "O Allah, I ask You for beneficial knowledge, pure provision, and deeds that are accepted",
    reference: "Ibn Majah 925"
  },
  {
    id: "knowledge_4",
    category: "Knowledge",
    arabic: "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِنْ لِسَانِي يَفْقَهُوا قَوْلِي",
    transliteration: "Rabbish-rah li sadri wa yassir li amri wahlul 'uqdatam-mil-lisani yafqahu qawli",
    translation: "My Lord, expand for me my breast, ease for me my task, and untie the knot from my tongue so they may understand my speech",
    reference: "Quran 20:25-28"
  },
  {
    id: "knowledge_5",
    category: "Knowledge",
    arabic: "اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا، وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلًا",
    transliteration: "Allahumma la sahla illa ma ja'altahu sahla, wa anta taj'alul-hazna idha shi'ta sahla",
    translation: "O Allah, nothing is easy except what You have made easy, and You can make hardship, if You will, easy",
    reference: "Ibn Hibban"
  },
  {
    id: "knowledge_6",
    category: "Knowledge",
    arabic: "سُبْحَانَكَ لَا عِلْمَ لَنَا إِلَّا مَا عَلَّمْتَنَا، إِنَّكَ أَنْتَ الْعَلِيمُ الْحَكِيمُ",
    transliteration: "Subhanaka la 'ilma lana illa ma 'allamtana, innaka antal-'Alimul-Hakim",
    translation: "Glory be to You, we have no knowledge except what You have taught us. Indeed, You are the All-Knowing, the All-Wise",
    reference: "Quran 2:32"
  },
  {
    id: "knowledge_7",
    category: "Knowledge",
    arabic: "اللَّهُمَّ فَقِّهْهُ فِي الدِّينِ وَعَلِّمْهُ التَّأْوِيلَ",
    transliteration: "Allahumma faqqihhu fid-dini wa 'allimhut-ta'wil",
    translation: "O Allah, grant him deep understanding of the religion and teach him interpretation (the Prophet's dua for Ibn Abbas)",
    reference: "Bukhari 143"
  },

  // ===== Rizq (Sustenance) Duas =====
  {
    id: "rizq_1",
    category: "Rizq",
    arabic: "رَبِّ إِنِّي لِمَا أَنْزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ",
    transliteration: "Rabbi inni lima anzalta ilayya min khayrin faqir",
    translation: "My Lord, I am truly in need of whatever good You send down to me",
    reference: "Quran 28:24",
    tags: ["dua-of-musa"]
  },
  {
    id: "rizq_2",
    category: "Rizq",
    arabic: "اللَّهُمَّ اغْفِرْ لِي وَارْحَمْنِي وَاهْدِنِي وَارْزُقْنِي وَعَافِنِي",
    transliteration: "Allahummaghfir li warhamni wahdini warzuqni wa 'afini",
    translation: "O Allah, forgive me, have mercy on me, guide me, provide for me, and grant me well-being",
    reference: "Muslim 2697"
  },
  {
    id: "rizq_3",
    category: "Rizq",
    arabic: "اللَّهُمَّ رَبَّ السَّمَاوَاتِ السَّبْعِ وَمَا أَظَلَّتْ، وَرَبَّ الْأَرَضِينَ وَمَا أَقَلَّتْ، وَرَبَّ الشَّيَاطِينِ وَمَا أَضَلَّتْ، كُنْ لِي جَارًا مِنْ شَرِّ خَلْقِكَ كُلِّهِمْ جَمِيعًا",
    transliteration: "Allahumma rabbas-samawatis-sab'i wa ma azallat, wa rabbal-ardina wa ma aqallat, wa rabbash-shayatini wa ma adallat, kun li jaram-min sharri khalqika kullihim jami'a",
    translation: "O Allah, Lord of the seven heavens and whatever they overshadow, Lord of the earths and whatever they carry, Lord of the devils and whatever they lead astray, be my Protector from the evil of all Your creation",
    reference: "Abu Dawud"
  },
  {
    id: "rizq_4",
    category: "Rizq",
    arabic: "مَا شَاءَ اللَّهُ لَا قُوَّةَ إِلَّا بِاللَّهِ",
    transliteration: "Masha Allah la quwwata illa billah",
    translation: "It is as Allah has willed; there is no power except with Allah (said when admiring something, so that it does not harm and the blessing is preserved)",
    reference: "Quran 18:39",
    tags: ["evil-eye", "gratitude"]
  },
  {
    id: "rizq_5",
    category: "Rizq",
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ",
    transliteration: "Allahumma inni a'udhu bika minal-kufr wal-faqri, wa a'udhu bika min 'adhabil-qabr",
    translation: "O Allah, I seek refuge in You from disbelief and poverty, and I seek refuge in You from the punishment of the grave",
    reference: "Abu Dawud"
  },
  {
    id: "rizq_6",
    category: "Rizq",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ",
    transliteration: "Alhamdulillahil-ladhi at'amani hadha wa razaqanihi min ghayri hawlin minni wa la quwwah",
    translation: "All praise is due to Allah who fed me this and provided it for me without any effort or power on my part",
    reference: "Tirmidhi, Abu Dawud",
    tags: ["after-eating"]
  },

  // ===== Anxiety & Grief Duas =====
  {
    id: "anxiety_1",
    category: "Anxiety & Grief",
    arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
    transliteration: "Hasbunallahu wa ni'mal-wakil",
    translation: "Sufficient for us is Allah, and He is the best Disposer of affairs",
    reference: "Quran 3:173"
  },
  {
    id: "anxiety_2",
    category: "Anxiety & Grief",
    arabic: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
    transliteration: "Hasbiyallahu la ilaha illa huwa, 'alayhi tawakkaltu, wa huwa rabbul-'arshil-'adhim",
    translation: "Allah is sufficient for me; there is no god but Him. In Him I trust, and He is the Lord of the Mighty Throne",
    reference: "Quran 9:129"
  },
  {
    id: "anxiety_3",
    category: "Anxiety & Grief",
    arabic: "يَا حَيُّ يَا قَيُّومُ، بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ",
    transliteration: "Ya Hayyu ya Qayyum, bi-rahmatika astaghith, aslih li sha'ni kullahu, wa la takilni ila nafsi tarfata 'ayn",
    translation: "O Ever-Living, O Self-Sustaining, by Your mercy I seek help. Set right all my affairs, and do not leave me to myself even for the blink of an eye",
    reference: "Tirmidhi"
  },
  {
    id: "anxiety_4",
    category: "Anxiety & Grief",
    arabic: "رَبِّ أَنِّي مَسَّنِيَ الضُّرُّ وَأَنْتَ أَرْحَمُ الرَّاحِمِينَ",
    transliteration: "Rabbi inni massaniyad-durru wa anta arhamur-rahimin",
    translation: "My Lord, indeed adversity has touched me, and You are the Most Merciful of the merciful",
    reference: "Quran 21:83",
    tags: ["dua-of-ayyub"]
  },
  {
    id: "anxiety_5",
    category: "Anxiety & Grief",
    arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
    transliteration: "La hawla wa la quwwata illa billah",
    translation: "There is no might nor power except with Allah (a treasure from the treasures of Paradise)",
    reference: "Bukhari 6384"
  },
  {
    id: "anxiety_6",
    category: "Anxiety & Grief",
    arabic: "إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ، اللَّهُمَّ أْجُرْنِي فِي مُصِيبَتِي، وَأَخْلِفْ لِي خَيْرًا مِنْهَا",
    transliteration: "Inna lillahi wa inna ilayhi raji'un, Allahummajurni fi musibati, wa akhlif li khayran minha",
    translation: "Indeed we belong to Allah, and indeed to Him we return. O Allah, reward me for my affliction and replace it with something better",
    reference: "Muslim 918",
    tags: ["calamity"]
  },

  // ===== Guidance & Steadfastness Duas =====
  {
    id: "guidance_1",
    category: "Guidance & Steadfastness",
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى",
    transliteration: "Allahumma inni as'alukal-huda wat-tuqa wal-'afafa wal-ghina",
    translation: "O Allah, I ask You for guidance, piety, chastity, and self-sufficiency",
    reference: "Muslim 2721"
  },
  {
    id: "guidance_2",
    category: "Guidance & Steadfastness",
    arabic: "يَا مُقَلِّبَ الْقُلُوبِ، ثَبِّتْ قَلْبِي عَلَى دِينِكَ",
    transliteration: "Ya muqallibal-qulub, thabbit qalbi 'ala dinik",
    translation: "O Turner of hearts, make my heart firm upon Your religion",
    reference: "Tirmidhi"
  },
  {
    id: "guidance_3",
    category: "Guidance & Steadfastness",
    arabic: "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةً إِنَّكَ أَنْتَ الْوَهَّابُ",
    transliteration: "Rabbana la tuzigh qulubana ba'da idh hadaytana, wa hab lana min ladunka rahmah, innaka antal-Wahhab",
    translation: "Our Lord, do not let our hearts deviate after You have guided us, and grant us mercy from Yourself. Indeed, You are the Bestower",
    reference: "Quran 3:8"
  },
  {
    id: "guidance_4",
    category: "Guidance & Steadfastness",
    arabic: "رَبَّنَا عَلَيْكَ تَوَكَّلْنَا وَإِلَيْكَ أَنَبْنَا وَإِلَيْكَ الْمَصِيرُ",
    transliteration: "Rabbana 'alayka tawakkalna wa ilayka anabna wa ilaykal-masir",
    translation: "Our Lord, in You we trust, to You we turn in repentance, and to You is the final return",
    reference: "Quran 60:4"
  },
  {
    id: "guidance_5",
    category: "Guidance & Steadfastness",
    arabic: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
    transliteration: "Ihdinas-siratal-mustaqim, siratal-ladhina an'amta 'alayhim ghayril-maghdubi 'alayhim wa lad-dallin",
    translation: "Guide us to the straight path, the path of those upon whom You have bestowed favor, not of those who have earned Your anger nor of those who are astray",
    reference: "Quran 1:6-7"
  },
  {
    id: "guidance_6",
    category: "Guidance & Steadfastness",
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ زَوَالِ نِعْمَتِكَ، وَتَحَوُّلِ عَافِيَتِكَ، وَفُجَاءَةِ نِقْمَتِكَ، وَجَمِيعِ سَخَطِكَ",
    transliteration: "Allahumma inni a'udhu bika min zawali ni'matika, wa tahawwuli 'afiyatika, wa fuja'ati niqmatika, wa jami'i sakhatik",
    translation: "O Allah, I seek refuge in You from the decline of Your blessings, the change of Your protection, Your sudden punishment, and all that displeases You",
    reference: "Muslim 2739"
  },

  // ===== Additional Weather Duas =====
  {
    id: "rain_2",
    category: "Weather",
    arabic: "اللَّهُمَّ اسْقِنَا غَيْثًا مُغِيثًا، مَرِيئًا مَرِيعًا، نَافِعًا غَيْرَ ضَارٍّ، عَاجِلًا غَيْرَ آجِلٍ",
    transliteration: "Allahumma asqina ghaythan mughithan, hayyiban mari'a, nafi'an ghayra dar, 'ajilan ghayra ajil",
    translation: "O Allah, send us rain that is reviving, nourishing, productive, beneficial and not harmful, coming sooner and not later (dua when asking for rain)",
    reference: "Bukhari 1013"
  },
  {
    id: "rain_3",
    category: "Weather",
    arabic: "مُطِرْنَا بِفَضْلِ اللَّهِ وَرَحْمَتِهِ",
    transliteration: "Mutirna bifadlillahi wa rahmatih",
    translation: "We have been given rain by the grace and mercy of Allah (said after rain falls)",
    reference: "Bukhari 846"
  },
  {
    id: "wind_1",
    category: "Weather",
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَهَا، وَخَيْرَ مَا فِيهَا، وَخَيْرَ مَا أُرْسِلَتْ بِهِ، وَأَعُوذُ بِكَ مِنْ شَرِّهَا، وَشَرِّ مَا فِيهَا، وَشَرِّ مَا أُرْسِلَتْ بِهِ",
    transliteration: "Allahumma inni as'aluka khayraha, wa khayra ma fiha, wa khayra ma ursilat bih, wa a'udhu bika min sharriha, wa sharri ma fiha, wa sharri ma ursilat bih",
    translation: "O Allah, I ask You for its good, the good within it, and the good it was sent with, and I seek refuge in You from its evil, the evil within it, and the evil it was sent with",
    reference: "Muslim 899",
    tags: ["wind"]
  },
  {
    id: "weather_1",
    category: "Weather",
    arabic: "سُبْحَانَ الَّذِي يُسَبِّحُ الرَّعْدُ بِحَمْدِهِ وَالْمَلَائِكَةُ مِنْ خِيفَتِهِ",
    transliteration: "Subhanal-ladhi yusabbihur-ra'du bihamdihi wal-mala'ikatu min khyafatih",
    translation: "Glory be to Him Whom the thunder glorifies with His praise, and the angels out of fear of Him (said upon hearing thunder)",
    reference: "Muwatta, Ahmad",
    tags: ["thunder"]
  },

  // ===== Dressing Duas =====
  {
    id: "dressing_1",
    category: "Dressing",
    arabic: "تُبْلِي وَيُخْلِفُ اللَّهُ تَعَالَى",
    transliteration: "Tubli wa yukhlifullahu ta'ala",
    translation: "May you wear it out, and may Allah the Most High replace it (said to another person upon wearing new clothes)",
    reference: "Abu Dawud 4020",
    tags: ["new-clothes"]
  },

  // ===== Additional Mosque Duas =====
  {
    id: "mosque_3",
    category: "Mosque",
    arabic: "بِسْمِ اللَّهِ، وَالسَّلَامُ عَلَى رَسُولِ اللَّهِ، اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
    transliteration: "Bismillahi was-salamu 'ala Rasulillah, Allahummaftah li abwaba rahmatik",
    translation: "In the name of Allah, and peace be upon the Messenger of Allah. O Allah, open for me the doors of Your mercy (said upon entering the masjid)",
    reference: "Muslim 713",
    tags: ["entering-masjid"]
  },
  {
    id: "mosque_4",
    category: "Mosque",
    arabic: "بِسْمِ اللَّهِ، وَالسَّلَامُ عَلَى رَسُولِ اللَّهِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ",
    transliteration: "Bismillahi was-salamu 'ala Rasulillah, Allahumma inni as'aluka min fadlik",
    translation: "In the name of Allah, and peace be upon the Messenger of Allah. O Allah, I ask You from Your bounty (said upon leaving the masjid)",
    reference: "Muslim 713",
    tags: ["leaving-masjid"]
  },

  // ===== After Adhan Duas =====
  {
    id: "adhan_1",
    category: "After Adhan",
    arabic: "أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ، رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ رَسُولًا",
    transliteration: "Ashhadu an la ilaha illallahu wahdahu la sharika lah, wa anna Muhammadan 'abduhu wa rasuluh, raditu billahi rabban, wa bil-islami dinan, wa bi Muhammadin rasula",
    translation: "I bear witness that there is no god but Allah alone, without partner, and that Muhammad is His servant and Messenger. I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad as my Messenger (said after the adhan)",
    reference: "Muslim 386"
  },
  {
    id: "adhan_2",
    category: "After Adhan",
    arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ",
    transliteration: "Allahumma salli 'ala Muhammadin wa 'ala ali Muhammad, kama sallayta 'ala Ibrahima wa 'ala ali Ibrahim, innaka Hamidum-Majid. Allahumma barik 'ala Muhammadin wa 'ala ali Muhammad, kama barakta 'ala Ibrahima wa 'ala ali Ibrahim, innaka Hamidum-Majid",
    translation: "O Allah, exalt Muhammad and the family of Muhammad as You exalted Ibrahim and the family of Ibrahim. Indeed, You are Praiseworthy, Glorious. O Allah, bless Muhammad and the family of Muhammad as You blessed Ibrahim and the family of Ibrahim. Indeed, You are Praiseworthy, Glorious (salawat said after the adhan)",
    reference: "Bukhari 3370"
  },
  {
    id: "adhan_3",
    category: "After Adhan",
    arabic: "اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ",
    transliteration: "Allahumma rabba hadhihid-da'watit-tammah, was-salatil-qa'imah, ati Muhammadan al-wasilata wal-fadilah, wab'athhu maqaman mahmudan alladhi wa'adtah",
    translation: "O Allah, Lord of this perfect call and the prayer to be offered, grant Muhammad the intercession and favor, and raise him to the honored station You have promised him (whoever says this after the adhan receives the Prophet's intercession)",
    reference: "Bukhari 614"
  },

  // ===== Additional Family Duas =====
  {
    id: "family_1",
    category: "Family",
    arabic: "رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا",
    transliteration: "Rabbana hab lana min azwajina wa dhurriyyatina qurrata a'yunin, waj'alna lil-muttaqina imama",
    translation: "Our Lord, grant us from among our spouses and offspring comfort to our eyes, and make us leaders for the righteous",
    reference: "Quran 25:74"
  },
  {
    id: "family_2",
    category: "Family",
    arabic: "رَبِّ لَا تَذَرْنِي فَرْدًا وَأَنْتَ خَيْرُ الْوَارِثِينَ",
    transliteration: "Rabbi la tadha'rni fardan, wa anta khayrul-warithin",
    translation: "My Lord, do not leave me alone, for You are the best of inheritors",
    reference: "Quran 21:89",
    tags: ["dua-of-zakariyya"]
  },
  {
    id: "family_3",
    category: "Family",
    arabic: "رَبِّ هَبْ لِي مِنَ الصَّالِحِينَ",
    transliteration: "Rabbi hab li minas-salihin",
    translation: "My Lord, grant me from among the righteous (a righteous child)",
    reference: "Quran 37:100",
    tags: ["dua-of-ibrahim"]
  },
  {
    id: "family_4",
    category: "Family",
    arabic: "رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِنْ ذُرِّيَّتِي، رَبَّنَا وَتَقَبَّلْ دُعَا",
    transliteration: "Rabbij'alni muqimas-salati wa min dhurriyyati, rabbana wa taqabbal du'a",
    translation: "My Lord, make me an establisher of prayer, and from my descendants. Our Lord, accept my supplication",
    reference: "Quran 14:40"
  },
  {
    id: "family_5",
    category: "Family",
    arabic: "رَبَّنَا اغْفِرْ لَنَا وَلِإِخْوَانِنَا الَّذِينَ سَبَقُونَا بِالْإِيمَانِ، وَلَا تَجْعَلْ فِي قُلُوبِنَا غِلًّا لِلَّذِينَ آمَنُوا، رَبَّنَا إِنَّكَ رَءُوفٌ رَحِيمٌ",
    transliteration: "Rabbana-ghfir lana wa li-ikhwaninal-ladhina sabaquna bil-iman, wa la taj'al fi qulubina ghillan lil-ladhina amanu, rabbana innaka ra'ufun rahim",
    translation: "Our Lord, forgive us and our brothers who preceded us in faith, and do not place in our hearts any resentment toward those who believe. Our Lord, indeed You are Kind and Merciful",
    reference: "Quran 59:10"
  },

  // ===== Laylatul Qadr Dua =====
  {
    id: "qadr_1",
    category: "Laylatul Qadr",
    arabic: "اللَّهُمَّ إِنَّكَ عَفُوٌّ كَرِيمٌ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي",
    transliteration: "Allahumma innaka 'afuwwun karim tuhibbul-'afwa fa'fu 'anni",
    translation: "O Allah, You are Most Forgiving and Generous, You love forgiveness, so forgive me (the Prophet's instruction to Aisha for Laylatul Qadr)",
    reference: "Tirmidhi 3513, Ibn Majah",
    tags: ["laylatul-qadr", "ramadan"]
  },

  // ===== Istikharah Dua =====
  {
    id: "istikharah_1",
    category: "Istikharah",
    arabic: "اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ، وَأَسْأَلُكَ مِنْ فَضْلِكَ الْعَظِيمِ، فَإِنَّكَ تَقْدِرُ وَلَا أَقْدِرُ، وَتَعْلَمُ وَلَا أَعْلَمُ، وَأَنْتَ عَلَّامُ الْغُيُوبِ. اللَّهُمَّ إِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ خَيْرٌ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي، فَاقْدُرْهُ لِي وَيَسِّرْهُ لِي، ثُمَّ بَارِكْ لِي فِيهِ. وَإِنْ كُنْتَ تَعْلَمُ أَنَّهُ شَرٌّ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي، فَاصْرِفْهُ عَنِّي وَاصْرِفْنِي عَنْهُ، وَاقْدُرْ لِيَ الْخَيْرَ حَيْثُ كَانَ، ثُمَّ رَضِّنِي بِهِ",
    transliteration: "Allahumma inni astakhiruka bi'ilmika, wa astaqdiruka biqudratika, wa as'aluka min fadlikal-'azim, fa-innaka taqdiru wa la aqdiru, wa ta'lamu wa la a'lamu, wa anta 'allamul-ghuyub. Allahumma in kunta ta'lamu anna hadhal-amra khayrun li fi dini wa ma'ashi wa 'aqibati amri, faqdurhu li wa yassirhu li, thumma barik li fih. Wa in kunta ta'lamu annahu sharrun li fi dini wa ma'ashi wa 'aqibati amri, fasrifhu 'anni wasrifni 'anh, waqdur liyal-khayra haythu kana, thumma radini bih",
    translation: "O Allah, I seek Your guidance by Your knowledge and Your power, and I ask You from Your immense favor, for You are able and I am not, You know and I do not, and You are the Knower of all that is hidden. O Allah, if You know that this matter is good for me in my religion, my livelihood, and the outcome of my affairs, then ordain it for me, make it easy for me, and bless it for me. And if You know that it is bad for me in my religion, my livelihood, and the outcome of my affairs, then turn it away from me and turn me away from it, and ordain for me the good wherever it may be, then make me content with it (said after two rak'ahs when choosing a matter)",
    reference: "Bukhari 1162",
    tags: ["istikharah", "decision-making"]
  },

  // ===== Wudu Duas =====
  {
    id: "wudu_1",
    category: "Wudu",
    arabic: "أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ، اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ، وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ",
    transliteration: "Ashhadu an la ilaha illallahu wahdahu la sharika lah, wa ashhadu anna Muhammadan 'abduhu wa rasuluh. Allahummaj'alni minat-tawwabin, waj'alni minal-mutatahhirin",
    translation: "I bear witness that there is no god but Allah alone, without partner, and I bear witness that Muhammad is His servant and Messenger. O Allah, make me among those who repent and make me among those who purify themselves (said after completing wudu)",
    reference: "Muslim 234, Tirmidhi 55"
  },
  {
    id: "wudu_2",
    category: "Wudu",
    arabic: "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ",
    transliteration: "Subhanakallahumma wa bihamdika, ashhadu an la ilaha illa anta, astaghfiruka wa atubu ilayk",
    translation: "Glory be to You, O Allah, and praise be to You. I bear witness that there is no god but You. I seek Your forgiveness and turn to You in repentance (said after wudu)",
    reference: "Nasa'i, Tirmidhi 48"
  }
];

export const duaCategories = [
  "All",
  "Morning",
  "Evening",
  "Travel",
  "Eating",
  "Sleeping",
  "Illness",
  "Distress",
  "Gratitude",
  "Forgiveness",
  "Protection",
  "Weather",
  "After Prayer",
  "Home",
  "Mosque",
  "Daily",
  "Special Days",
  "Knowledge",
  "Character",
  "Marriage",
  "Family",
  "Financial",
  "Afterlife",
  "Repentance",
  "Parents",
  "Fasting",
  "Hajj & Umrah",
  "New Moon",
  "Rizq",
  "Wudu",
  "Dressing",
  "After Adhan",
  "Anxiety & Grief",
  "Guidance & Steadfastness",
  "Laylatul Qadr",
  "Istikharah"
];
