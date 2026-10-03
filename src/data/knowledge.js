// Starter clinical knowledge base for health assistants caring for older adults at home.
// ⚠ Draft content — to be reviewed and extended by doctors through the Doctor Tool.
// Every text is { en, ar }. Lists are arrays of { en, ar }.

const x = (en, ar) => ({ en, ar });

/* ───────────── Findings ─────────────
   lookFor        — what the assistant checks
   earlyCare      — first actions to stop the change getting worse
   treatment      — simple home treatment within an assistant's role
   redFlags       — signs that need a nurse/doctor; any one ticked ⇒ urgent referral */
export const FINDINGS = {
  redness: {
    label: x('Redness', 'احمرار'),
    lookFor: x('Red or darker area compared with the skin around it.', 'منطقة حمراء أو أغمق من الجلد المحيط بها.'),
    earlyCare: [
      x('Keep pressure and rubbing off the area.', 'أبعد الضغط والاحتكاك عن المنطقة.'),
      x('Keep the skin clean and dry.', 'حافظ على الجلد نظيفًا وجافًا.'),
      x('Check the area again within a few hours.', 'افحص المنطقة مرة أخرى خلال ساعات قليلة.'),
    ],
    treatment: [x('Moisturize dry skin around the area (not on broken skin).', 'رطّب الجلد الجاف حول المنطقة (وليس على الجلد المجروح).')],
    redFlags: [
      x('Spreading quickly or red streaks', 'ينتشر بسرعة أو تظهر خطوط حمراء'),
      x('Fever or the person feels unwell', 'حمى أو الشخص يشعر بتوعك'),
      x('Hot and very painful', 'ساخن ومؤلم جدًا'),
    ],
  },
  pressureMark: {
    label: x("Redness that doesn't fade when pressed", 'احمرار لا يزول عند الضغط'),
    lookFor: x(
      'Press lightly with a finger for 3 seconds. If the red does not turn pale, it may be an early pressure injury.',
      'اضغط بإصبعك بلطف لمدة ٣ ثوانٍ. إذا لم يتحول الاحمرار إلى لون فاتح فقد تكون بداية قرحة فراش.'
    ),
    earlyCare: [
      x('Change position at least every 2 hours.', 'غيّر وضعية الشخص كل ساعتين على الأقل.'),
      x('Use pillows to lift the area off the bed (for example, float the heels).', 'استخدم الوسائد لرفع المنطقة عن السرير (مثل رفع الكعبين).'),
      x('Do not massage the red area.', 'لا تدلّك المنطقة الحمراء.'),
    ],
    treatment: [
      x('Use a pressure-relieving mattress or cushion if available.', 'استخدم مرتبة أو وسادة مخففة للضغط إن توفرت.'),
      x('Keep skin clean, dry and moisturized.', 'حافظ على الجلد نظيفًا وجافًا ومرطبًا.'),
    ],
    redFlags: [
      x('Skin is broken, blistered or has a dark/purple patch', 'الجلد مجروح أو فيه فقاعة أو بقعة داكنة/بنفسجية'),
      x('Area feels hard, boggy or very warm', 'المنطقة صلبة أو رخوة أو ساخنة جدًا'),
      x('Not better after 1–2 days off pressure', 'لم تتحسن بعد يوم أو يومين من إزالة الضغط'),
    ],
  },
  wound: {
    label: x('Open wound / skin tear', 'جرح مفتوح أو تمزق جلدي'),
    lookFor: x('Broken skin, a raw area, a skin flap, or bleeding.', 'جلد مجروح أو منطقة ملتهبة مكشوفة أو جلد ممزق أو نزيف.'),
    earlyCare: [
      x('Wash hands and wear gloves.', 'اغسل يديك والبس القفازات.'),
      x('Rinse gently with clean water or saline.', 'اشطف بلطف بماء نظيف أو محلول ملحي.'),
      x('Protect the area from pressure and rubbing.', 'احمِ المنطقة من الضغط والاحتكاك.'),
    ],
    treatment: [
      x('Cover with a clean non-stick dressing.', 'غطِّ بضمادة نظيفة غير لاصقة.'),
      x('For a skin tear, gently lay the flap back in place before covering.', 'في حالة التمزق، أعد طرف الجلد إلى مكانه بلطف قبل التغطية.'),
    ],
    redFlags: [
      x('Deep, large, or bleeding will not stop', 'عميق أو كبير أو النزيف لا يتوقف'),
      x('Pus, bad smell, spreading redness or fever', 'صديد أو رائحة كريهة أو احمرار منتشر أو حمى'),
      x('Getting bigger or not healing after a few days', 'يكبر أو لا يلتئم بعد عدة أيام'),
    ],
  },
  blister: {
    label: x('Blister', 'فقاعة'),
    lookFor: x('A raised bubble of fluid under the skin.', 'انتفاخ مملوء بسائل تحت الجلد.'),
    earlyCare: [
      x('Do not pop the blister.', 'لا تفقأ الفقاعة.'),
      x('Remove pressure and rubbing from the area.', 'أزل الضغط والاحتكاك عن المنطقة.'),
      x('Protect with a soft padded dressing.', 'احمِها بضمادة ناعمة مبطنة.'),
    ],
    treatment: [x('If it bursts, rinse gently and cover with a clean dressing.', 'إذا انفجرت، اشطفها بلطف وغطّها بضمادة نظيفة.')],
    redFlags: [
      x('Blood-filled or dark blister', 'فقاعة مملوءة بالدم أو داكنة'),
      x('Pus, spreading redness or warmth', 'صديد أو احمرار منتشر أو سخونة'),
      x('Many blisters without a clear reason', 'فقاعات كثيرة بدون سبب واضح'),
    ],
  },
  bruise: {
    label: x('Bruise', 'كدمة'),
    lookFor: x('A blue, purple or yellow-green patch.', 'بقعة زرقاء أو بنفسجية أو صفراء مخضرة.'),
    earlyCare: [
      x('Ask about falls or bumps.', 'اسأل عن السقوط أو الاصطدام.'),
      x('Cold compress wrapped in cloth for 10–15 minutes on the first day.', 'كمادة باردة ملفوفة بقماش لمدة ١٠–١٥ دقيقة في اليوم الأول.'),
      x('Handle the limbs gently.', 'تعامل مع الأطراف بلطف.'),
    ],
    treatment: [x('Raise the limb if it is swollen.', 'ارفع الطرف إذا كان متورمًا.')],
    redFlags: [
      x('After a fall, with pain, swelling or trouble moving', 'بعد سقوط مع ألم أو تورم أو صعوبة في الحركة'),
      x('Large or many bruises without a reason', 'كدمات كبيرة أو كثيرة بدون سبب'),
      x('On blood thinners and the bruise is growing', 'يتناول مميعات الدم والكدمة تكبر'),
    ],
  },
  swelling: {
    label: x('Swelling', 'تورم'),
    lookFor: x('The area looks puffy or bigger than the other side. Press gently: does a dent stay?', 'المنطقة منتفخة أو أكبر من الجهة الأخرى. اضغط بلطف: هل تبقى حفرة؟'),
    earlyCare: [
      x('Compare with the other side.', 'قارن مع الجهة الأخرى.'),
      x('Raise the leg or arm on a pillow when resting.', 'ارفع الساق أو الذراع على وسادة أثناء الراحة.'),
      x('Encourage gentle movement if allowed.', 'شجّع الحركة الخفيفة إذا كانت مسموحة.'),
    ],
    treatment: [x('Avoid tight clothing and tight socks.', 'تجنّب الملابس والجوارب الضيقة.')],
    redFlags: [
      x('One leg suddenly swollen, warm and painful', 'ساق واحدة متورمة فجأة وساخنة ومؤلمة'),
      x('With shortness of breath or chest pain', 'مع ضيق نفس أو ألم في الصدر'),
      x('Swelling after a fall or injury', 'تورم بعد سقوط أو إصابة'),
    ],
  },
  rash: {
    label: x('Rash / itching', 'طفح جلدي أو حكة'),
    lookFor: x('Spots, bumps or patches; scratch marks.', 'بقع أو حبوب أو مناطق متغيرة؛ آثار حكة.'),
    earlyCare: [
      x('Keep the area clean and dry.', 'حافظ على المنطقة نظيفة وجافة.'),
      x('Use mild, fragrance-free products.', 'استخدم منتجات لطيفة بدون عطور.'),
      x('Keep nails short to avoid scratch damage.', 'قصّ الأظافر لتجنب أذى الحكة.'),
    ],
    treatment: [
      x('Fragrance-free moisturizer if the skin is dry.', 'مرطب بدون عطر إذا كان الجلد جافًا.'),
      x('Loose cotton clothing.', 'ملابس قطنية واسعة.'),
    ],
    redFlags: [
      x('Rash with fever or feeling unwell', 'طفح مع حمى أو توعك'),
      x('Blisters, peeling or spreading fast', 'فقاعات أو تقشر أو انتشار سريع'),
      x('Swollen face/lips or trouble breathing — emergency', 'تورم الوجه/الشفاه أو صعوبة التنفس — طوارئ'),
    ],
  },
  dryness: {
    label: x('Dry or cracked skin', 'جفاف أو تشقق الجلد'),
    lookFor: x('Flaky, rough or cracked skin.', 'جلد متقشر أو خشن أو متشقق.'),
    earlyCare: [
      x('Wash with lukewarm, not hot, water.', 'اغسل بماء فاتر وليس ساخنًا.'),
      x('Pat dry and moisturize every day.', 'جفّف بالتربيت ورطّب يوميًا.'),
      x('Encourage enough fluids.', 'شجّع على شرب كمية كافية من السوائل.'),
    ],
    treatment: [x('Thick fragrance-free moisturizer twice a day (not between the toes).', 'مرطب كثيف بدون عطر مرتين يوميًا (ليس بين الأصابع).')],
    redFlags: [
      x('Deep cracks that bleed', 'تشققات عميقة تنزف'),
      x('Cracks with redness, pus or pain', 'تشققات مع احمرار أو صديد أو ألم'),
    ],
  },
  moisture: {
    label: x('Moist / soggy skin', 'جلد رطب أو متعطّن'),
    lookFor: x('Wet, white, wrinkled or soft skin — often in skin folds or the diaper area.', 'جلد مبلل أو أبيض أو متجعد أو طري — غالبًا في الثنيات أو منطقة الحفاضة.'),
    earlyCare: [
      x('Clean gently and pat dry, including skin folds.', 'نظّف بلطف وجفّف بالتربيت مع ثنيات الجلد.'),
      x('Change wet clothes or pads promptly.', 'غيّر الملابس أو الفوط المبللة فورًا.'),
      x('Apply a skin protectant (barrier cream).', 'ضع واقي الجلد (كريم عازل).'),
    ],
    treatment: [x('Place a soft cotton cloth in deep skin folds.', 'ضع قطعة قطن ناعمة في ثنيات الجلد العميقة.')],
    redFlags: [
      x('Skin breaks down or becomes raw', 'الجلد يتهتك أو يصبح ملتهبًا مكشوفًا'),
      x('Bright red rash with small spots at the edges', 'طفح أحمر لامع مع بقع صغيرة على الأطراف'),
    ],
  },
  warmth: {
    label: x('Warm / hot area', 'سخونة في المنطقة'),
    lookFor: x('Skin feels warmer than the same place on the other side.', 'الجلد أدفأ من نفس المكان في الجهة الأخرى.'),
    earlyCare: [
      x('Check the body temperature.', 'قِس حرارة الجسم.'),
      x('Look for redness, swelling or pain.', 'ابحث عن احمرار أو تورم أو ألم.'),
      x('Recheck in a few hours.', 'أعد الفحص بعد ساعات قليلة.'),
    ],
    treatment: [x('Rest the area.', 'أرح المنطقة.')],
    redFlags: [
      x('Temperature above 38°C', 'حرارة أعلى من ٣٨ درجة'),
      x('Hot, red, swollen and painful', 'ساخن وأحمر ومتورم ومؤلم'),
      x('Warm, swollen calf', 'بطة الساق ساخنة ومتورمة'),
    ],
  },
  pain: {
    label: x('Pain', 'ألم'),
    lookFor: x('Ask the person, or watch for grimacing, moaning or protecting the area.', 'اسأل الشخص، أو لاحظ تعابير الألم أو الأنين أو حماية المنطقة.'),
    earlyCare: [
      x('Score the pain from 0 to 10 and record it.', 'قيّم الألم من ٠ إلى ١٠ وسجّله.'),
      x('Change position gently and support with pillows.', 'غيّر الوضعية بلطف وادعم بالوسائد.'),
      x('Ask what makes it better or worse.', 'اسأل ما الذي يحسّنه أو يزيده.'),
    ],
    treatment: [x('Give pain medicine only as prescribed by the doctor.', 'أعطِ مسكن الألم فقط حسب وصفة الطبيب.')],
    redFlags: [
      x('Sudden severe pain', 'ألم شديد مفاجئ'),
      x("After a fall, or can't move / bear weight", 'بعد سقوط، أو لا يستطيع الحركة أو الوقوف'),
      x('Chest pain or pain spreading to arm/jaw — emergency', 'ألم في الصدر أو يمتد للذراع/الفك — طوارئ'),
    ],
  },
  discharge: {
    label: x('Discharge or bad smell', 'إفرازات أو رائحة كريهة'),
    lookFor: x('Fluid, pus or an unusual smell from the skin or a wound.', 'سائل أو صديد أو رائحة غير معتادة من الجلد أو الجرح.'),
    earlyCare: [
      x('Wear gloves and clean gently.', 'البس القفازات ونظّف بلطف.'),
      x('Note the colour, amount and smell.', 'سجّل اللون والكمية والرائحة.'),
      x('Change dressings when they are wet.', 'غيّر الضمادات عندما تتبلل.'),
    ],
    treatment: [x('Keep the area clean and covered.', 'حافظ على المنطقة نظيفة ومغطاة.')],
    redFlags: [
      x('Pus, green/yellow discharge or bad smell', 'صديد أو إفرازات خضراء/صفراء أو رائحة كريهة'),
      x('With fever or spreading redness', 'مع حمى أو احمرار منتشر'),
    ],
  },
  circulation: {
    label: x('Pale, blue or very dark colour', 'شحوب أو ازرقاق أو لون داكن جدًا'),
    lookFor: x('Skin looks pale, bluish, blotchy or very dark, and may feel cold.', 'الجلد شاحب أو مزرق أو مبقع أو داكن جدًا وقد يكون باردًا.'),
    earlyCare: [
      x('Compare with the other side.', 'قارن مع الجهة الأخرى.'),
      x('Keep warm with socks and blankets (no hot-water bottle directly on skin).', 'دفّئ بالجوارب والبطانيات (بدون قربة ماء ساخن على الجلد مباشرة).'),
      x('Avoid tight clothing.', 'تجنّب الملابس الضيقة.'),
    ],
    treatment: [],
    redFlags: [
      x('Limb suddenly cold, pale or blue — emergency', 'طرف أصبح فجأة باردًا أو شاحبًا أو أزرق — طوارئ'),
      x('Black areas on toes or fingers', 'مناطق سوداء في أصابع القدم أو اليد'),
      x('Blue lips or face', 'ازرقاق الشفاه أو الوجه'),
    ],
  },
  stiffness: {
    label: x('Stiffness / hard to move', 'تيبّس أو صعوبة الحركة'),
    lookFor: x('The joint is hard to move, or the person avoids moving it.', 'المفصل صعب الحركة أو الشخص يتجنب تحريكه.'),
    earlyCare: [
      x('Gentle range-of-motion exercises if allowed.', 'تمارين حركة لطيفة إذا كانت مسموحة.'),
      x('Support joints in a natural position with pillows.', 'ادعم المفاصل بوضع طبيعي بالوسائد.'),
      x('Encourage regular movement.', 'شجّع على الحركة المنتظمة.'),
    ],
    treatment: [x('A warm (not hot) compress before exercise may help.', 'قد تساعد كمادة دافئة (غير ساخنة) قبل التمارين.')],
    redFlags: [
      x('Sudden weakness of one side, face drooping or speech trouble — emergency (stroke)', 'ضعف مفاجئ في جهة واحدة أو ميلان الوجه أو صعوبة الكلام — طوارئ (جلطة)'),
      x('New stiffness with fever', 'تيبّس جديد مع حمى'),
      x('Joint hot, red and swollen', 'المفصل ساخن وأحمر ومتورم'),
    ],
  },
  nails: {
    label: x('Nail or toe problems', 'مشاكل الأظافر أو الأصابع'),
    lookFor: x('Thick, ingrown or discoloured nails; cracks between the toes.', 'أظافر سميكة أو منغرسة أو متغيرة اللون؛ تشققات بين الأصابع.'),
    earlyCare: [
      x('Wash and dry the feet daily, especially between the toes.', 'اغسل القدمين وجففهما يوميًا خاصة بين الأصابع.'),
      x('Check the feet every day if the person has diabetes.', 'افحص القدمين يوميًا إذا كان الشخص مصابًا بالسكري.'),
      x('Use well-fitting shoes and clean socks.', 'استخدم حذاءً مناسبًا وجوارب نظيفة.'),
    ],
    treatment: [x('Trim nails straight across (ask a foot specialist if thick or diabetic).', 'قصّ الأظافر بشكل مستقيم (استشر أخصائي القدم إذا كانت سميكة أو مع السكري).')],
    redFlags: [
      x('Ingrown nail with redness or pus', 'ظفر منغرس مع احمرار أو صديد'),
      x('Any wound on the foot of a person with diabetes', 'أي جرح في قدم شخص مصاب بالسكري'),
      x('Black or blue toe', 'إصبع أسود أو أزرق'),
    ],
  },
  lump: {
    label: x('Lump', 'كتلة'),
    lookFor: x('A new bump under the skin.', 'نتوء جديد تحت الجلد.'),
    earlyCare: [
      x('Note its size, whether it is hard or soft, and if it moves.', 'سجّل حجمها وهل هي صلبة أو طرية وهل تتحرك.'),
      x("Don't squeeze it.", 'لا تضغط عليها.'),
      x('Recheck and compare over time.', 'أعد الفحص وقارن مع الوقت.'),
    ],
    treatment: [],
    redFlags: [
      x('Growing, hard or painful', 'تكبر أو صلبة أو مؤلمة'),
      x('With fever or redness', 'مع حمى أو احمرار'),
    ],
  },
  eyeIssue: {
    label: x('Eye redness or discharge', 'احمرار أو إفرازات العين'),
    lookFor: x('Red eye, crusting, discharge or watery eye.', 'احمرار العين أو قشور أو إفرازات أو دموع.'),
    earlyCare: [
      x('Wipe from the inner to the outer corner with clean cotton and boiled, cooled water.', 'امسح من الزاوية الداخلية للخارجية بقطن نظيف وماء مغلي مبرد.'),
      x('Use a separate piece of cotton for each eye.', 'استخدم قطعة قطن منفصلة لكل عين.'),
      x('Wash hands before and after.', 'اغسل يديك قبل وبعد.'),
    ],
    treatment: [],
    redFlags: [
      x('Eye pain or sudden change in vision', 'ألم في العين أو تغير مفاجئ في الرؤية'),
      x('Swollen eyelid with fever', 'تورم الجفن مع حمى'),
    ],
  },
  mouth: {
    label: x('Mouth problems', 'مشاكل الفم'),
    lookFor: x('Dry lips, sores, white patches or poorly fitting dentures.', 'جفاف الشفاه أو تقرحات أو بقع بيضاء أو طقم أسنان غير مناسب.'),
    earlyCare: [
      x('Mouth care twice a day with a soft brush.', 'العناية بالفم مرتين يوميًا بفرشاة ناعمة.'),
      x('Encourage sips of water.', 'شجّع على رشفات الماء.'),
      x('Clean dentures daily and remove them at night.', 'نظّف طقم الأسنان يوميًا وانزعه ليلًا.'),
    ],
    treatment: [x('Lip balm for dry lips.', 'مرطب شفاه للشفاه الجافة.')],
    redFlags: [
      x('Not eating or drinking', 'لا يأكل ولا يشرب'),
      x("Sores or white patches that don't go away in 2 weeks", 'تقرحات أو بقع بيضاء لا تزول خلال أسبوعين'),
    ],
  },
  breathing: {
    label: x('Breathing difficulty or cough', 'صعوبة التنفس أو السعال'),
    lookFor: x('Fast or noisy breathing, cough, or shortness of breath.', 'تنفس سريع أو مسموع، سعال، أو ضيق نفس.'),
    earlyCare: [
      x('Sit the person upright.', 'أجلس الشخص بوضع مستقيم.'),
      x('Count breaths for one minute.', 'عدّ مرات التنفس في دقيقة.'),
      x('Encourage fluids if allowed.', 'شجّع على السوائل إذا كان مسموحًا.'),
    ],
    treatment: [],
    redFlags: [
      x('Severe shortness of breath or blue lips — emergency', 'ضيق نفس شديد أو ازرقاق الشفاه — طوارئ'),
      x('Chest pain', 'ألم في الصدر'),
      x('Cough with fever or coloured phlegm', 'سعال مع حمى أو بلغم ملوّن'),
    ],
  },
  bloating: {
    label: x('Bloated or hard belly', 'انتفاخ أو تصلب البطن'),
    lookFor: x('The belly looks swollen or feels hard. Ask about bowel movements.', 'البطن منتفخ أو صلب. اسأل عن التبرز.'),
    earlyCare: [
      x('Record the last bowel movement.', 'سجّل آخر مرة تبرز.'),
      x('Encourage fluids and fibre if allowed.', 'شجّع على السوائل والألياف إذا كان مسموحًا.'),
      x('Encourage gentle movement.', 'شجّع على الحركة الخفيفة.'),
    ],
    treatment: [],
    redFlags: [
      x('Severe pain or vomiting', 'ألم شديد أو قيء'),
      x('No bowel movement for 3+ days with pain', 'لا تبرز لأكثر من ٣ أيام مع ألم'),
      x('Blood in stool or black stool', 'دم في البراز أو براز أسود'),
    ],
  },
};

/* ───────────── Body regions ───────────── */
const PRESSURE_TIP = x(
  'Pressure point: change position every 2 hours and keep weight off this area.',
  'نقطة ضغط: غيّر الوضعية كل ساعتين وأبعد الوزن عن هذه المنطقة.'
);
const FOOT_TIP = x('Check feet every day, especially with diabetes.', 'افحص القدمين يوميًا، خاصة مع مرض السكري.');
const IAD_TIP = x('For urine or stool on the skin, also use the IAD skin check.', 'عند تعرض الجلد للبول أو البراز، استخدم أيضًا فحص التهاب الجلد (IAD).');

const SKIN_PRESSURE = ['redness', 'pressureMark', 'blister', 'wound', 'moisture', 'rash', 'pain'];

function both(id, en, ar, side, findings, tip) {
  return [
    { id: `${id}L`, name: x(`Left ${en}`, `${ar} الأيسر`), side, findings, tip },
    { id: `${id}R`, name: x(`Right ${en}`, `${ar} الأيمن`), side, findings, tip },
  ];
}
function bothF(id, en, ar, side, findings, tip) {
  // Arabic feminine nouns (اليد، الساق، القدم، الركبة…)
  return [
    { id: `${id}L`, name: x(`Left ${en}`, `${ar} اليسرى`), side, findings, tip },
    { id: `${id}R`, name: x(`Right ${en}`, `${ar} اليمنى`), side, findings, tip },
  ];
}

export const REGIONS = [
  { id: 'head', name: x('Head & scalp', 'الرأس وفروة الرأس'), side: 'back', tip: PRESSURE_TIP,
    findings: ['redness', 'pressureMark', 'wound', 'rash', 'dryness', 'bruise', 'lump', 'pain'] },
  { id: 'face', name: x('Face, eyes & mouth', 'الوجه والعينان والفم'), side: 'front',
    findings: ['redness', 'rash', 'dryness', 'swelling', 'wound', 'bruise', 'eyeIssue', 'mouth', 'pain'] },
  { id: 'neck', name: x('Neck', 'الرقبة'), side: 'front',
    findings: ['redness', 'rash', 'moisture', 'swelling', 'lump', 'stiffness', 'pain'] },
  ...both('shoulder', 'shoulder', 'الكتف', 'front', ['pain', 'stiffness', 'swelling', 'bruise', 'redness', 'pressureMark']),
  { id: 'chest', name: x('Chest', 'الصدر'), side: 'front',
    findings: ['breathing', 'redness', 'rash', 'moisture', 'wound', 'pain', 'lump'] },
  { id: 'upperBack', name: x('Upper back & shoulder blades', 'أعلى الظهر ولوحا الكتف'), side: 'back', tip: PRESSURE_TIP, findings: SKIN_PRESSURE },
  { id: 'abdomen', name: x('Belly', 'البطن'), side: 'front',
    findings: ['bloating', 'pain', 'rash', 'moisture', 'redness', 'wound', 'swelling'] },
  { id: 'lowerBack', name: x('Lower back & sacrum', 'أسفل الظهر والعجز'), side: 'back', tip: PRESSURE_TIP, findings: SKIN_PRESSURE },
  ...both('hip', 'hip', 'الورك', 'front', ['redness', 'pressureMark', 'wound', 'bruise', 'pain', 'stiffness', 'swelling'], PRESSURE_TIP),
  { id: 'groin', name: x('Groin & genital area', 'منطقة العانة والأعضاء التناسلية'), side: 'front', tip: IAD_TIP,
    findings: ['moisture', 'rash', 'redness', 'wound', 'discharge', 'swelling', 'pain'] },
  { id: 'buttockL', name: x('Left buttock', 'الأرداف - الجهة اليسرى'), side: 'back', tip: PRESSURE_TIP, findings: SKIN_PRESSURE },
  { id: 'buttockR', name: x('Right buttock', 'الأرداف - الجهة اليمنى'), side: 'back', tip: PRESSURE_TIP, findings: SKIN_PRESSURE },
  ...both('upperArm', 'upper arm', 'العضد', 'front', ['bruise', 'wound', 'swelling', 'dryness', 'rash', 'pain']),
  ...both('elbow', 'elbow', 'المرفق', 'back', ['redness', 'pressureMark', 'wound', 'dryness', 'swelling', 'stiffness', 'pain'], PRESSURE_TIP),
  ...both('forearm', 'forearm', 'الساعد', 'front', ['bruise', 'wound', 'dryness', 'swelling', 'rash', 'pain']),
  ...bothF('hand', 'hand', 'اليد', 'front', ['swelling', 'circulation', 'dryness', 'wound', 'nails', 'stiffness', 'warmth', 'pain']),
  ...both('thigh', 'thigh', 'الفخذ', 'front', ['redness', 'moisture', 'rash', 'bruise', 'swelling', 'wound', 'warmth', 'pain']),
  ...bothF('knee', 'knee', 'الركبة', 'front', ['swelling', 'warmth', 'stiffness', 'redness', 'bruise', 'pressureMark', 'pain']),
  ...bothF('lowerLeg', 'lower leg', 'الساق', 'front', ['swelling', 'circulation', 'dryness', 'wound', 'warmth', 'redness', 'bruise', 'pain']),
  ...both('ankle', 'ankle', 'الكاحل', 'front', ['swelling', 'redness', 'pressureMark', 'wound', 'circulation', 'pain'], PRESSURE_TIP),
  ...bothF('foot', 'foot', 'القدم', 'front', ['nails', 'dryness', 'wound', 'blister', 'circulation', 'swelling', 'moisture', 'warmth', 'pain'], FOOT_TIP),
  ...both('heel', 'heel', 'الكعب', 'back', ['redness', 'pressureMark', 'blister', 'wound', 'dryness', 'circulation', 'pain'], PRESSURE_TIP),
];

export const regionById = (id) => REGIONS.find((r) => r.id === id);
export const REGION_INDEX = Object.fromEntries(REGIONS.map((r, i) => [r.id, i + 1]));
export const REGION_COUNT = REGIONS.length + 1;

export const SEVERITIES = ['mild', 'moderate', 'severe'];
export const URGENCY_ORDER = ['routine', 'watch', 'soon', 'urgent'];

/* Urgency for one region record:
   any red flag ⇒ urgent · any severe ⇒ soon · any moderate ⇒ watch · otherwise routine.
   A change for the worse since the last check raises it one level, up to "soon" —
   "urgent" is reserved for danger signs (red flags). */
export function regionUrgency(rec, change) {
  let u = 'routine';
  if (rec.findings.length === 0) return 'routine';
  if (rec.redFlags?.length) u = 'urgent';
  else if (rec.findings.some((f) => f.severity === 'severe') || (rec.pain ?? 0) >= 7) u = 'soon';
  else if (rec.findings.some((f) => f.severity === 'moderate') || (rec.pain ?? 0) >= 4) u = 'watch';
  if (change === 'worse' && (u === 'routine' || u === 'watch')) u = URGENCY_ORDER[URGENCY_ORDER.indexOf(u) + 1];
  return u;
}

export const maxUrgency = (list) =>
  list.reduce((a, b) => (URGENCY_ORDER.indexOf(b) > URGENCY_ORDER.indexOf(a) ? b : a), 'routine');

const SEV_SCORE = { mild: 1, moderate: 2, severe: 3 };
const score = (rec) => rec.findings.reduce((s, f) => s + SEV_SCORE[f.severity], 0) + (rec.redFlags?.length || 0) * 3 + Math.round((rec.pain ?? 0) / 3);

// Early detection: compare this region record with the previous one for the same patient.
export function compareRecords(prev, cur) {
  if (!prev) return cur.findings.length ? 'new' : 'none';
  const newFinding = cur.findings.some((f) => !prev.findings.some((p) => p.id === f.id));
  const a = score(prev), b = score(cur);
  if (newFinding || b > a) return 'worse';
  if (b < a) return 'better';
  return 'same';
}
