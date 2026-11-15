const speakerProfiles = {
  "Бабунашвили А.М.": {
    "name": "Бабунашвили Автандил Михайлович",
    "role": "Заведующий отделением сердечно-сосудистой хирургии многопрофильного центра эндоваскулярной хирургии и литотрипсии, профессор, доктор медицинских наук",
    "photoURL": "https://trec-course.ru/images/slider-directorate/babunashvili.jpg"
  },
  "Демин В.В.": {
    "name": "Демин Виктор Владимирович",
    "role": "д.м.н., профессор кафедры клинической медицины Оренбургского государственного медицинского университета, заслуженный врач РФ",
    "photoURL": "https://trec-course.ru/images/slider-directorate/Демин В.В..png"
  },
  "Семитко С.П.": {
    "name": "Семитко Сергей Петрович",
    "role": "Доктор медицинских наук, директор Центра интервенционной кардиоангиологии Сеченовского университета",
    "photoURL": "https://trec-course.ru/images/slider-directorate/semitko_s.jpg"
  },
  "Шугушев З.Х.": {
    "name": "Шугушев Заур Хасанович",
    "role": "Заведующий РХМДиЛ, ЦКБ Семашко №2 РЖД-Медицина, профессор, доктор медицинских наук",
    "photoURL": "https://trec-course.ru/images/slider-directorate/shugushev.jpg"
  },
  "Кретов Е.И.": {
    "name": "Кретов Евгений Иванович",
    "role": "д.м.н., врач по рентгенэндоваскулярным диагностике и лечению, г. Новосибирск",
    "photoURL": "https://trec-course.ru/images/slider-directorate/kretov.jpg"
  },
  "Амирханян Д.С.": {
    "name": "Амирханян Давид Самсонович",
    "role": "Сердечно-сосудистый хирург, ассистент кафедры госпитальной хирургии РНИМУ им. Н. И. Пирогова",
    "city": "Москва"
  }
};
function fillSpeakerProfiles(program) {
 for(const person of program.speakers){
  const profile=speakerProfiles[person.name];
  if(!profile)continue;
  for(const [field,value] of Object.entries(profile)){
   if(field==="name" || !person[field])person[field]=value;
  }
 }
}
