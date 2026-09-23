const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Database for Supermarket Home Delivery ---');

  // 1. Ensure Default Admin exists
  const adminEmail = 'admin@hajar.com';
  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const password = await bcrypt.hash('admin', 10);
    await prisma.admin.create({
      data: {
        email: adminEmail,
        password,
        name: 'Hajar Supermarkt'
      }
    });
    console.log('✓ Admin account initialized (admin@hajar.com / admin)');
  } else {
    console.log('✓ Admin account already exists');
  }

  // 2. Categories to seed
  const categoriesData = [
    {
      nameDe: 'Obst & Gemüse',
      nameAr: 'الفواكه والخضروات',
      descriptionDe: 'Frisches Obst und knackiges Gemüse täglich frisch geliefert',
      descriptionAr: 'فواكه وخضروات طازجة يومياً مباشرة إلى منزلك'
    },
    {
      nameDe: 'Milchprodukte & Eier',
      nameAr: 'الألبان والبيض',
      descriptionDe: 'Frische Milch, Käse, Joghurt, Butter und Eier aus kontrollierter Haltung',
      descriptionAr: 'حليب طازج، أجبان، زبادي، زبدة وبيض من مزارع معتمدة'
    },
    {
      nameDe: 'Bäckerei & Frisches Brot',
      nameAr: 'المخبوزات والخبز الطازج',
      descriptionDe: 'Fladenbrot, Croissants, Vollkornbrot und feine Backwaren',
      descriptionAr: 'خبز عربي، كرواسون، خبز الحبوب الكاملة ومخبوزات يومية طازجة'
    },
    {
      nameDe: 'Getränke & Erfrischungen',
      nameAr: 'المشروبات والعصائر',
      descriptionDe: 'Säfte, Mineralwasser, Tees und traditionelle Erfrischungen',
      descriptionAr: 'عصائر طبيعية، مياه معدنية، شاي ومشروبات منعشة'
    },
    {
      nameDe: 'Vorratskammer & Grundnahrungsmittel',
      nameAr: 'البقالة والمؤن الأساسية',
      descriptionDe: 'Reis, Teigwaren, Olivenöl, Hülsenfrüchte und Konserven',
      descriptionAr: 'أرز بسمتي، معكرونة، زيت زيتون، بقوليات ومعلبات أساسية'
    },
    {
      nameDe: 'Süßes, Nüsse & Snacks',
      nameAr: 'الحلويات والمكسرات',
      descriptionDe: 'Premium Datteln, Halva, Schokolade und geröstete Nüsse',
      descriptionAr: 'تمور ملكية فاخرة، حلاوة طحينية، شوكولاتة ومكسرات محمصة'
    }
  ];

  // Map to store category records by nameDe
  const categoryMap = {};

  for (const cat of categoriesData) {
    let category = await prisma.category.findFirst({
      where: {
        OR: [
          { nameDe: cat.nameDe },
          { nameAr: cat.nameAr }
        ]
      }
    });

    if (!category) {
      category = await prisma.category.create({ data: cat });
      console.log(`+ Created Category: ${cat.nameDe} / ${cat.nameAr}`);
    } else {
      category = await prisma.category.update({
        where: { id: category.id },
        data: cat
      });
      console.log(`✓ Updated Category: ${cat.nameDe}`);
    }

    categoryMap[cat.nameDe] = category.id;
  }

  // 3. Products to seed
  const productsData = [
    // --- Obst & Gemüse ---
    {
      sku: 'OBST-BAN-001',
      name: 'Bio-Bananen (1kg)',
      nameDe: 'Bio-Bananen (1kg)',
      nameAr: 'موز عضوي طازج (1 كغ)',
      description: 'Frische Bio-Bananen aus fairem Anbau',
      descriptionDe: 'Frische, reife Bio-Bananen aus fairem Anbau. Ideal für den gesunden Snack zwischendurch.',
      descriptionAr: 'موز عضوي طازج وناضج من مزارع عادلة، مثالي للوجبات الخفيفة والصحية.',
      b2bPrice: 1.99,
      stock: 65,
      imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Obst & Gemüse'
    },
    {
      sku: 'OBST-ERD-002',
      name: 'Erdbeeren Schale (500g)',
      nameDe: 'Erdbeeren Schale (500g)',
      nameAr: 'فراولة طازجة مختارة (500 غ)',
      description: 'Süße frische Erdbeeren der Extra-Klasse',
      descriptionDe: 'Süße, hocharomatische frische Erdbeeren der Extra-Klasse. Täglich frisch angeliefert.',
      descriptionAr: 'فراولة طازجة وحلوة المذاق من الدرجة الممتازة، غنية بالنكهة الطبيعية.',
      b2bPrice: 2.89,
      stock: 40,
      imageUrl: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Obst & Gemüse'
    },
    {
      sku: 'OBST-APF-003',
      name: 'Äpfel Gala (1kg Beutel)',
      nameDe: 'Äpfel Gala (1kg Beutel)',
      nameAr: 'تفاح جالا أحمر مقرمش (1 كغ)',
      description: 'Knackige, saftig-süße Gala Äpfel',
      descriptionDe: 'Knackige, saftig-süße Gala Äpfel, reich an Vitaminen und wertvollen Ballaststoffen.',
      descriptionAr: 'تفاح جالا مقرمش وعصاري حلو وغني بالفيتامينات، مثالي لجميع أفراد الأسرة.',
      b2bPrice: 2.49,
      stock: 80,
      imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Obst & Gemüse'
    },
    {
      sku: 'GEM-TOM-004',
      name: 'Rispen-Tomaten (500g)',
      nameDe: 'Rispen-Tomaten (500g)',
      nameAr: 'طماطم عناقيد حمراء طازجة (500 غ)',
      description: 'Aromatische rote Rispentomaten',
      descriptionDe: 'Aromatische rote Rispentomaten, sonnengereift für Salate, Saucen und mediterrane Gerichte.',
      descriptionAr: 'طماطم عناقيد حمراء عطرية نضجت تحت أشعة الشمس للسلطات والطبخ اليومي.',
      b2bPrice: 1.79,
      stock: 55,
      imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Obst & Gemüse'
    },
    {
      sku: 'GEM-AVO-005',
      name: 'Bio-Avocado Ready-to-Eat (2 Stk.)',
      nameDe: 'Bio-Avocado Ready-to-Eat (2 Stk.)',
      nameAr: 'أفوكادو هاس عضوي جاهز للأكل (حبتان)',
      description: 'Cremige, verzehrfertige Bio-Avocados',
      descriptionDe: 'Cremige, verzehrfertige Bio-Avocados der Sorte Hass mit feinnussigem Geschmack.',
      descriptionAr: 'أفوكادو هاس عضوي كريمي وجاهز للأكل مباشرة بقوام ناعم وطعم رائع.',
      b2bPrice: 2.99,
      stock: 35,
      imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Obst & Gemüse'
    },
    {
      sku: 'GEM-GUR-006',
      name: 'Salatgurke frisch (1 Stk.)',
      nameDe: 'Salatgurke frisch (1 Stk.)',
      nameAr: 'خيار طازج ومقرمش (قطعة واحدة)',
      description: 'Knackige grüne Salatgurke',
      descriptionDe: 'Knackige grüne Salatgurke aus kontrolliertem Anbau, saftig und erfrischend.',
      descriptionAr: 'خيار أخضر طازج ومقرمش من مزارع معتمدة، منعش ومثالي للسلطات.',
      b2bPrice: 0.89,
      stock: 70,
      imageUrl: 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Obst & Gemüse'
    },

    // --- Milchprodukte & Eier ---
    {
      sku: 'MIL-VOL-007',
      name: 'Frische Vollmilch 3,5% (1L)',
      nameDe: 'Frische Vollmilch 3,5% (1L)',
      nameAr: 'حليب طازج كامل الدسم 3.5% (1 لتر)',
      description: 'Frische pasteurisierte Vollmilch',
      descriptionDe: 'Frische pasteurisierte Vollmilch mit natürlichem Fettgehalt von mindestens 3,5%.',
      descriptionAr: 'حليب بقري طازج مبستر كامل الدسم بنسبة 3.5% دهن، نكهة طبيعية غنية.',
      b2bPrice: 1.39,
      stock: 100,
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Milchprodukte & Eier'
    },
    {
      sku: 'MIL-EIE-008',
      name: 'Bio Freilandeier Gr. M (10er Pack)',
      nameDe: 'Bio Freilandeier Gr. M (10er Pack)',
      nameAr: 'بيض بلدي عضوي مرعى حر (10 بيضات)',
      description: 'Frische Eier aus Bio-Freilandhaltung',
      descriptionDe: 'Frische Eier aus biologischer Freilandhaltung. Zertifizierte Herkunft und beste Qualität.',
      descriptionAr: 'بيض طازج من دجاج مرعى حر بتغذية عضوية متوازنة وجودة مضمونة.',
      b2bPrice: 3.29,
      stock: 50,
      imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Milchprodukte & Eier'
    },
    {
      sku: 'MIL-BUT-009',
      name: 'Deutsche Markenbutter (250g)',
      nameDe: 'Deutsche Markenbutter (250g)',
      nameAr: 'زبدة ألمانية طبيعية ممتازة (250 غ)',
      description: 'Feinste Sauerrahmbutter aus frischer Milch',
      descriptionDe: 'Feinste Sauerrahmbutter aus bester deutscher Milch. Perfekt zum Kochen, Backen und aufs Brot.',
      descriptionAr: 'زبدة فاخرة مصنوعة من الحليب الطبيعي، مثالية للطبخ والخبز ودهن الخبز.',
      b2bPrice: 2.19,
      stock: 60,
      imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Milchprodukte & Eier'
    },
    {
      sku: 'MIL-JOG-010',
      name: 'Griechischer Naturjoghurt 10% (500g)',
      nameDe: 'Griechischer Naturjoghurt 10% (500g)',
      nameAr: 'زبادي يوناني طبيعي كريمي 10% (500 غ)',
      description: 'Cremiger Joghurt nach griechischer Art',
      descriptionDe: 'Cremiger Joghurt nach traditioneller griechischer Art mit vollmundigen 10% Fettgehalt.',
      descriptionAr: 'زبادي يوناني تقليدي قوام كريمي غني ولذيذ بنسبة دسم 10% طبيعي.',
      b2bPrice: 1.89,
      stock: 45,
      imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Milchprodukte & Eier'
    },
    {
      sku: 'MIL-KAE-011',
      name: 'Mediterraner Weißkäse in Salzlake (400g)',
      nameDe: 'Mediterraner Weißkäse in Salzlake (400g)',
      nameAr: 'جبنة بيضاء متوسطية في ماء مملح (400 غ)',
      description: 'Traditioneller Salzlakenkäse',
      descriptionDe: 'Würziger traditioneller Salzlakenkäse aus Kuhmilch. Ideal für Salate, Börek und Vorspeisen.',
      descriptionAr: 'جبنة بيضاء شهية محفوظة في محلول ملحي، ممتازة للسلطات والمعجنات والمقبلات.',
      b2bPrice: 3.49,
      stock: 35,
      imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Milchprodukte & Eier'
    },

    // --- Bäckerei & Frisches Brot ---
    {
      sku: 'BAK-FLA-012',
      name: 'Arabisches Fladenbrot groß (5 Stk.)',
      nameDe: 'Arabisches Fladenbrot groß (5 Stk.)',
      nameAr: 'خبز عربي سياحي كبير (5 أرغفة)',
      description: 'Frisches traditionelles Fladenbrot',
      descriptionDe: 'Weiches, traditionelles Fladenbrot frisch verpackt. Optimal für Dips, Wraps und Shawarma.',
      descriptionAr: 'خبز عربي طازج طري ومثالي للشاورما والغموس والوجبات اليومية.',
      b2bPrice: 1.49,
      stock: 75,
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Bäckerei & Frisches Brot'
    },
    {
      sku: 'BAK-CRO-013',
      name: 'Butter-Croissants frisch (4er Pack)',
      nameDe: 'Butter-Croissants frisch (4er Pack)',
      nameAr: 'كرواسون فرنسي طازج بالزبدة (4 قطع)',
      description: 'Luftig-lockere französische Buttercroissants',
      descriptionDe: 'Luftig-lockere Croissants mit feiner Butter gebacken. Knusprig und zart schmelzend.',
      descriptionAr: 'كرواسون فرنسي هش ومقرمش بطبقات غنية بالزبدة لإفطار صباحي مميز.',
      b2bPrice: 2.69,
      stock: 30,
      imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Bäckerei & Frisches Brot'
    },
    {
      sku: 'BAK-VOL-014',
      name: 'Vollkorn-Krustenbrot (500g)',
      nameDe: 'Vollkorn-Krustenbrot (500g)',
      nameAr: 'خبز حبوب كاملة مقرمش بالخميرة الطبيعية (500 غ)',
      description: 'Herzhaftes Natursauerteigbrot',
      descriptionDe: 'Herzhaftes Natursauerteigbrot mit Roggen- und Weizenvollkorn und knuspriger Kruste.',
      descriptionAr: 'خبز الحبوب الكاملة بالخميرة الطبيعية، صحي ومغذي وغني بالألياف مع قشرة مقرمشة.',
      b2bPrice: 2.29,
      stock: 25,
      imageUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Bäckerei & Frisches Brot'
    },

    // --- Getränke & Erfrischungen ---
    {
      sku: 'GET-ORA-015',
      name: 'Orangensaft Direktsaft 100% (1L)',
      nameDe: 'Orangensaft Direktsaft 100% (1L)',
      nameAr: 'عصير برتقال طبيعي نقي 100% (1 لتر)',
      description: '100% reiner Direktsaft ohne Zuckerzusatz',
      descriptionDe: '100% reiner Direktsaft aus sonnenverwöhnten Orangen mit natürlichem Fruchtfleisch.',
      descriptionAr: 'عصير برتقال طبيعي 100% معصور بدون أي سكر مضاف مع قطع لب البرتقال الطبيعي.',
      b2bPrice: 2.19,
      stock: 60,
      imageUrl: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Getränke & Erfrischungen'
    },
    {
      sku: 'GET-WAS-016',
      name: 'Mineralwasser Medium (6 x 1,5L)',
      nameDe: 'Mineralwasser Medium (6 x 1,5L)',
      nameAr: 'مياه معدنية طبيعية متوسطة الغاز (6 × 1.5 لتر)',
      description: 'Natürliches Mineralwasser Sixpack',
      descriptionDe: 'Natürliches Mineralwasser mit sanfter Kohlensäure im praktischen Sixpack direkt nach Hause geliefert.',
      descriptionAr: 'مياه معدنية طبيعية نقية معتدلة الفوران في حزمة توفيرية 6 زجاجات.',
      b2bPrice: 3.99,
      stock: 40,
      imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Getränke & Erfrischungen'
    },
    {
      sku: 'GET-TEE-017',
      name: 'Ceylon Schwarztee Pekoe Premium (500g)',
      nameDe: 'Ceylon Schwarztee Pekoe Premium (500g)',
      nameAr: 'شاي سيلاني أسود فاخر أوراق كاملة (500 غ)',
      description: 'Hochwertiger loser Ceylon-Schwarztee',
      descriptionDe: 'Hochwertiger loser Ceylon-Schwarztee mit vollmundigem, erfrischendem Aroma und goldener Tassenfarbe.',
      descriptionAr: 'شاي سيلاني أسود فاخر أوراق كاملة نكهة قوية ولون ذهبي رائع.',
      b2bPrice: 5.49,
      stock: 45,
      imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Getränke & Erfrischungen'
    },

    // --- Vorratskammer & Grundnahrungsmittel ---
    {
      sku: 'VOR-REI-018',
      name: 'Premium Basmati Reis (1kg)',
      nameDe: 'Premium Basmati Reis (1kg)',
      nameAr: 'أرز بسمتي هندي طويل الحبة فاخر (1 كغ)',
      description: 'Extra langkörniger, aromatischer Basmati-Reis',
      descriptionDe: 'Extra langkörniger, duftender Basmati-Reis höchster Güteklasse. Bleibt beim Kochen locker und körnig.',
      descriptionAr: 'أرز بسمتي هندي عنبر حبة طويلة نقية ورائحة زكية، لا يلتصق ومثالي لأشهى الوجبات.',
      b2bPrice: 3.49,
      stock: 90,
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Vorratskammer & Grundnahrungsmittel'
    },
    {
      sku: 'VOR-OEL-019',
      name: 'Natives Olivenöl Extra Vergine (750ml)',
      nameDe: 'Natives Olivenöl Extra Vergine (750ml)',
      nameAr: 'زيت زيتون بكر ممتاز عصرة باردة أولى (750 مل)',
      description: 'Kaltgepresstes erstklassiges Olivenöl',
      descriptionDe: 'Kaltgepresstes, fruchtiges Olivenöl erster Güteklasse. Ideal für Salate, Marinaden und mediterrane Küche.',
      descriptionAr: 'زيت زيتون بكر ممتاز من العصرة الأولى على البارد لنكهة غنية وفوائد صحية عالية.',
      b2bPrice: 7.99,
      stock: 50,
      imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Vorratskammer & Grundnahrungsmittel'
    },
    {
      sku: 'VOR-NUD-020',
      name: 'Spaghetti No. 5 Hartweizen (500g)',
      nameDe: 'Spaghetti No. 5 Hartweizen (500g)',
      nameAr: 'معكرونة سباغيتي رقم 5 من قمح القساوة (500 غ)',
      description: 'Italienische Qualitäts-Hartweizenspaghetti',
      descriptionDe: 'Italienische Hartweizennudeln für den perfekten Al-Dente-Biss. Hochwertige Teigwaren für die ganze Familie.',
      descriptionAr: 'مكرونة سباغيتي إيطالية كلاسيكية من قمح الدوران عالي الجودة متماسكة ولذيذة.',
      b2bPrice: 1.49,
      stock: 110,
      imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Vorratskammer & Grundnahrungsmittel'
    },
    {
      sku: 'VOR-KIC-021',
      name: 'Kichererbsen getrocknet (1kg)',
      nameDe: 'Kichererbsen getrocknet (1kg)',
      nameAr: 'حمص حب يابس ممتاز (1 كغ)',
      description: 'Ausgewählte Kichererbsen',
      descriptionDe: 'Ausgewählte Kichererbsen höchster Reinheit, ideal für selbstgemachten Hummus, Falafel und Eintöpfe.',
      descriptionAr: 'حبوب حمص جافة ومختارة بعناية لتحضير أشهى أطباق الحمص والفلافل والشوربات.',
      b2bPrice: 2.79,
      stock: 45,
      imageUrl: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Vorratskammer & Grundnahrungsmittel'
    },

    // --- Süßes, Nüsse & Snacks ---
    {
      sku: 'SUE-DAT-022',
      name: 'Medjool Jumbo Datteln Premium (500g)',
      nameDe: 'Medjool Jumbo Datteln Premium (500g)',
      nameAr: 'تمور مجدول ملكية جامبو فاخرة (500 غ)',
      description: 'Große, saftige Medjool-Datteln',
      descriptionDe: 'Saftig-süße Medjool-Datteln im Naturzustand, besonders groß, weich und karamellig im Geschmack.',
      descriptionAr: 'تمور مجدول فاخرة حجم ملكي، حلاوة طبيعية وقوام طري وغني بالطاقة والمعادن.',
      b2bPrice: 6.99,
      stock: 45,
      imageUrl: 'https://images.unsplash.com/photo-1594918585918-0a0a524a876a?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Süßes, Nüsse & Snacks'
    },
    {
      sku: 'SUE-HAL-023',
      name: 'Tahini Sesam-Halva mit Pistazien (350g)',
      nameDe: 'Tahini Sesam-Halva mit Pistazien (350g)',
      nameAr: 'حلاوة طحينية فاخرة بالفستق الحلبي (350 غ)',
      description: 'Traditionelle Halva mit ganzen Pistazien',
      descriptionDe: 'Traditionelle Halva aus 100% fein gemahlenem Sesam mit ganzen Pistazienkernen veredelt.',
      descriptionAr: 'حلاوة طحينية شرقية فاخرة مصنوعة من السمسم الصافي وغنية بحبات الفستق المقرمشة.',
      b2bPrice: 3.99,
      stock: 35,
      imageUrl: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Süßes, Nüsse & Snacks'
    },
    {
      sku: 'SUE-SCH-024',
      name: 'Edelbitter Schokolade 70% Kakao (100g)',
      nameDe: 'Edelbitter Schokolade 70% Kakao (100g)',
      nameAr: 'شوكولاتة داكنة نقية 70% كاكاو (100 غ)',
      description: 'Feinherbe Schokolade aus edlem Kakao',
      descriptionDe: 'Feinherbe Schokolade mit 70% Kakaoanteil aus nachhaltigem Anbau. Zarter Schmelz für Genießer.',
      descriptionAr: 'شوكولاتة داكنة فاخرة بنسبة 70% كاكاو نقي، طعم كلاسيكي راقٍ يذوب في الفم.',
      b2bPrice: 1.79,
      stock: 60,
      imageUrl: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=600&q=80',
      categoryName: 'Süßes, Nüsse & Snacks'
    }
  ];

  for (const prod of productsData) {
    const categoryId = categoryMap[prod.categoryName] || null;
    const { categoryName, ...prodData } = prod;

    const product = await prisma.product.upsert({
      where: { sku: prod.sku },
      update: {
        ...prodData,
        categoryId
      },
      create: {
        ...prodData,
        categoryId
      }
    });

    console.log(`+ Seeded Product [${product.sku}]: ${product.name} (€${product.b2bPrice.toFixed(2)})`);
  }

  const deliveryWindowCount = await prisma.deliveryWindow.count();
  if (deliveryWindowCount === 0) {
    await prisma.deliveryWindow.createMany({
      data: [
        { startHour: 10, endHour: 12, sortOrder: 0 },
        { startHour: 16, endHour: 18, sortOrder: 1 }
      ]
    });
    console.log('+ Seeded 2 default delivery time windows (10-12, 16-18)');
  }

  console.log(`\n✓ Seeding finished successfully! Seeded ${categoriesData.length} categories and ${productsData.length} products.`);
}

main()
  .catch((error) => {
    console.error('Seeding error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
