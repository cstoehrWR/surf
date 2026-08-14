import { PrismaClient, ProductType, ResourceStatus, Role, SurfLevel, BookingStatus, PaymentStatus, PaymentMethod, SessionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { addMinutes } from "../src/lib/utils";

const prisma = new PrismaClient();
const PASSWORD = "SurfDemo!2026";

function at(date: Date, hours: number, minutes = 0) {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function reset() {
  const tables = [
    "WebhookDelivery",
    "WebhookEndpoint",
    "ResourceAssignment",
    "SessionParticipant",
    "SessionInstructor",
    "WaiverSignature",
    "BookingStatusHistory",
    "Payment",
    "Invoice",
    "BookingItem",
    "Participant",
    "Booking",
    "WaitlistEntry",
    "CourseSession",
    "Consent",
    "Customer",
    "ProductResourceRequirement",
    "ProductImage",
    "ProductTranslation",
    "ProductVariant",
    "PriceRule",
    "WaiverTemplateProduct",
    "WaiverTemplate",
    "Product",
    "Resource",
    "ResourceType",
    "InstructorAbsence",
    "InstructorWeeklyAvailability",
    "InstructorProductType",
    "InstructorLocation",
    "Instructor",
    "LoginAttempt",
    "Account",
    "AuditLog",
    "Notification",
    "EmailTemplate",
    "AutomationRule",
    "CustomField",
    "Voucher",
    "DiscountCode",
    "BlackoutPeriod",
    "OpeningHours",
    "Season",
    "User",
    "Location",
    "Organization",
  ];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}";`);
  }
}

async function main() {
  await reset();
  const passwordHash = bcrypt.hashSync(PASSWORD, 10);
  const today = startOfDay(new Date());

  const org = await prisma.organization.create({
    data: {
      name: "North Sea Surf School",
      slug: "north-sea-surf",
      locale: "de",
      timezone: "Europe/Berlin",
    },
  });

  const location = await prisma.location.create({
    data: {
      organizationId: org.id,
      name: "Nordstrand",
      slug: "nordstrand",
      address: "Nordstrand, Nordsee",
      openingHours: {
        create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          weekday,
          openTime: "08:00",
          closeTime: "18:00",
        })),
      },
    },
  });

  await prisma.season.create({
    data: {
      organizationId: org.id,
      locationId: location.id,
      name: "Hauptsaison",
      startsOn: new Date("2026-05-01"),
      endsOn: new Date("2026-10-15"),
    },
  });

  const admin = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: "Lea Admin",
      email: "admin@northseasurf.example",
      passwordHash,
      role: Role.ADMIN,
    },
  });
  await prisma.user.create({
    data: {
      organizationId: org.id,
      name: "Super Admin",
      email: "superadmin@northseasurf.example",
      passwordHash,
      role: Role.SUPER_ADMIN,
    },
  });
  await prisma.user.create({
    data: {
      organizationId: org.id,
      name: "Nina Rezeption",
      email: "office@northseasurf.example",
      passwordHash,
      role: Role.OFFICE,
    },
  });
  const tomUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: "Tom Instructor",
      email: "tom@northseasurf.example",
      passwordHash,
      role: Role.INSTRUCTOR,
    },
  });
  const sarahUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: "Sarah Instructor",
      email: "sarah@northseasurf.example",
      passwordHash,
      role: Role.INSTRUCTOR,
    },
  });

  const tom = await prisma.instructor.create({
    data: {
      organizationId: org.id,
      userId: tomUser.id,
      firstName: "Tom",
      lastName: "Hartwig",
      email: "tom@northseasurf.example",
      qualifications: ["VDWS", "Rettungsschwimmer"],
      level: SurfLevel.ADVANCED,
      locations: { create: { locationId: location.id } },
      productTypes: {
        create: [
          { productType: ProductType.GROUP_COURSE },
          { productType: ProductType.PRIVATE_COURSE },
          { productType: ProductType.MULTI_DAY_COURSE },
        ],
      },
      weeklyAvail: {
        create: [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({
          weekday,
          startTime: "08:00",
          endTime: "18:00",
        })),
      },
    },
  });
  const sarah = await prisma.instructor.create({
    data: {
      organizationId: org.id,
      userId: sarahUser.id,
      firstName: "Sarah",
      lastName: "Nielsen",
      email: "sarah@northseasurf.example",
      qualifications: ["VDWS"],
      level: SurfLevel.INTERMEDIATE,
      locations: { create: { locationId: location.id } },
      productTypes: {
        create: [
          { productType: ProductType.GROUP_COURSE },
          { productType: ProductType.PRIVATE_COURSE },
        ],
      },
      weeklyAvail: {
        create: [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({
          weekday,
          startTime: "08:00",
          endTime: "18:00",
        })),
      },
    },
  });

  const boardType = await prisma.resourceType.create({
    data: { organizationId: org.id, key: "surfboard", name: "Surfboard" },
  });
  const neoType = await prisma.resourceType.create({
    data: { organizationId: org.id, key: "wetsuit", name: "Neoprenanzug" },
  });

  for (let i = 1; i <= 20; i++) {
    await prisma.resource.create({
      data: {
        organizationId: org.id,
        locationId: location.id,
        resourceTypeId: boardType.id,
        inventoryCode: `SB-${String(i).padStart(3, "0")}`,
        name: `Surfboard ${i}`,
        attributes: { type: i <= 8 ? "soft" : "hard", size: "7'0", volume: 55 + i, level: "BEGINNER" },
        status: i === 20 ? ResourceStatus.DEFECT : ResourceStatus.AVAILABLE,
      },
    });
  }
  for (let i = 1; i <= 30; i++) {
    await prisma.resource.create({
      data: {
        organizationId: org.id,
        locationId: location.id,
        resourceTypeId: neoType.id,
        inventoryCode: `NP-${String(i).padStart(3, "0")}`,
        name: `Neopren ${i}`,
        attributes: { size: ["XS", "S", "M", "L", "XL"][i % 5], thickness: "5/4", fit: i % 2 ? "m" : "w" },
        status: ResourceStatus.AVAILABLE,
      },
    });
  }

  const schnupper = await prisma.product.create({
    data: {
      organizationId: org.id,
      locationId: location.id,
      type: ProductType.GROUP_COURSE,
      slug: "surf-schnupperkurs",
      name: "Surf Schnupperkurs",
      description: "Erste Wellen, sicheres Wassergefühl, Spaß garantiert.",
      category: "Kurse",
      durationMinutes: 120,
      basePrice: 59,
      minParticipants: 1,
      maxParticipants: 8,
      minAge: 8,
      surfLevel: SurfLevel.NONE,
      bookingLeadHours: 2,
      instructorRatio: 8,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      startTimes: ["09:00", "13:00"],
      published: true,
      translations: {
        create: [
          { locale: "de", name: "Surf Schnupperkurs", description: "Erste Wellen, sicheres Wassergefühl, Spaß garantiert." },
          { locale: "en", name: "Surf Taster Course", description: "First waves, water confidence, guaranteed fun." },
        ],
      },
      variants: {
        create: [
          { name: "Erwachsener", price: 59, minAge: 16 },
          { name: "Kind", price: 49, maxAge: 15 },
        ],
      },
      requirements: {
        create: [
          { resourceTypeId: boardType.id, quantityPerParticipant: 1, required: true },
          { resourceTypeId: neoType.id, quantityPerParticipant: 1, required: true },
        ],
      },
    },
  });

  const anfaenger = await prisma.product.create({
    data: {
      organizationId: org.id,
      locationId: location.id,
      type: ProductType.GROUP_COURSE,
      slug: "surf-anfaenger",
      name: "Surf Anfänger",
      description: "Grundtechniken, Starten, Stehen, erste Green Waves.",
      category: "Kurse",
      durationMinutes: 120,
      basePrice: 69,
      maxParticipants: 8,
      minAge: 12,
      surfLevel: SurfLevel.BEGINNER,
      bookingLeadHours: 2,
      instructorRatio: 8,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      startTimes: ["10:00", "14:00"],
      published: true,
      translations: {
        create: [
          { locale: "de", name: "Surf Anfänger", description: "Grundtechniken, Starten, Stehen, erste Green Waves." },
          { locale: "en", name: "Surf Beginner", description: "Basics, pop-up and first green waves." },
        ],
      },
      variants: {
        create: [
          { name: "Erwachsener", price: 69, minAge: 16 },
          { name: "Kind", price: 49, maxAge: 15 },
        ],
      },
      requirements: {
        create: [
          { resourceTypeId: boardType.id, quantityPerParticipant: 1, required: true },
          { resourceTypeId: neoType.id, quantityPerParticipant: 1, required: true },
        ],
      },
    },
  });

  const forti = await prisma.product.create({
    data: {
      organizationId: org.id,
      locationId: location.id,
      type: ProductType.GROUP_COURSE,
      slug: "surf-fortgeschritten",
      name: "Surf Fortgeschritten",
      description: "Bottom Turns, Timing und Linienwahl.",
      category: "Kurse",
      durationMinutes: 120,
      basePrice: 79,
      maxParticipants: 6,
      surfLevel: SurfLevel.INTERMEDIATE,
      bookingLeadHours: 2,
      instructorRatio: 6,
      weekdays: [1, 2, 3, 4, 5, 6],
      startTimes: ["11:30"],
      published: true,
      translations: {
        create: [
          { locale: "de", name: "Surf Fortgeschritten", description: "Bottom Turns, Timing und Linienwahl." },
          { locale: "en", name: "Surf Intermediate", description: "Bottom turns, timing and line choice." },
        ],
      },
      variants: { create: [{ name: "Standard", price: 79 }] },
      requirements: {
        create: [
          { resourceTypeId: boardType.id, quantityPerParticipant: 1, required: true },
          { resourceTypeId: neoType.id, quantityPerParticipant: 1, required: true },
        ],
      },
    },
  });

  const privat = await prisma.product.create({
    data: {
      organizationId: org.id,
      locationId: location.id,
      type: ProductType.PRIVATE_COURSE,
      slug: "privatunterricht",
      name: "Privatunterricht",
      description: "1:1 Coaching auf deinem Level.",
      category: "Kurse",
      durationMinutes: 90,
      basePrice: 120,
      maxParticipants: 2,
      instructorRatio: 2,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      startTimes: ["09:00", "11:00", "15:00"],
      published: true,
      translations: {
        create: [
          { locale: "de", name: "Privatunterricht", description: "1:1 Coaching auf deinem Level." },
          { locale: "en", name: "Private Lesson", description: "1:1 coaching on your level." },
        ],
      },
      variants: { create: [{ name: "90 Minuten", price: 120 }] },
      requirements: {
        create: [
          { resourceTypeId: boardType.id, quantityPerParticipant: 1, required: true },
          { resourceTypeId: neoType.id, quantityPerParticipant: 1, required: true },
        ],
      },
    },
  });

  const kids = await prisma.product.create({
    data: {
      organizationId: org.id,
      locationId: location.id,
      type: ProductType.GROUP_COURSE,
      slug: "kids-surfkurs",
      name: "Kids Surfkurs",
      description: "Spielerisch surfen lernen ab 8 Jahren.",
      category: "Kurse",
      durationMinutes: 120,
      basePrice: 49,
      maxParticipants: 8,
      minAge: 8,
      maxAge: 14,
      surfLevel: SurfLevel.BEGINNER,
      instructorRatio: 6,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      startTimes: ["14:00"],
      published: true,
      translations: {
        create: [
          { locale: "de", name: "Kids Surfkurs", description: "Spielerisch surfen lernen ab 8 Jahren." },
          { locale: "en", name: "Kids Surf Course", description: "Learn to surf from age 8." },
        ],
      },
      variants: { create: [{ name: "Kind", price: 49, maxAge: 14 }] },
      requirements: {
        create: [
          { resourceTypeId: boardType.id, quantityPerParticipant: 1, required: true },
          { resourceTypeId: neoType.id, quantityPerParticipant: 1, required: true },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      organizationId: org.id,
      locationId: location.id,
      type: ProductType.RENTAL,
      slug: "board-verleih",
      name: "Board-Verleih",
      description: "Soft- und Hardboards für 2 Stunden.",
      category: "Verleih",
      durationMinutes: 120,
      basePrice: 25,
      maxParticipants: 20,
      requiredInstructors: 0,
      instructorRatio: 99,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      startTimes: ["09:00", "11:00", "13:00", "15:00"],
      published: true,
      variants: { create: [{ name: "2 Stunden", price: 25 }] },
      requirements: { create: [{ resourceTypeId: boardType.id, quantityPerParticipant: 1 }] },
    },
  });
  await prisma.product.create({
    data: {
      organizationId: org.id,
      locationId: location.id,
      type: ProductType.RENTAL,
      slug: "neopren-verleih",
      name: "Neopren-Verleih",
      description: "Neoprenanzüge in allen Größen.",
      category: "Verleih",
      durationMinutes: 120,
      basePrice: 15,
      maxParticipants: 30,
      requiredInstructors: 0,
      instructorRatio: 99,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      startTimes: ["09:00"],
      published: true,
      variants: { create: [{ name: "2 Stunden", price: 15 }] },
      requirements: { create: [{ resourceTypeId: neoType.id, quantityPerParticipant: 1 }] },
    },
  });
  await prisma.product.create({
    data: {
      organizationId: org.id,
      locationId: location.id,
      type: ProductType.ADDON,
      slug: "fotoshooting",
      name: "Fotoshooting",
      description: "Professionelle Action-Fotos deiner Session.",
      category: "Zusatz",
      durationMinutes: 120,
      basePrice: 29,
      maxParticipants: 8,
      requiredInstructors: 0,
      instructorRatio: 99,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      startTimes: ["09:00"],
      published: true,
      variants: { create: [{ name: "Session-Paket", price: 29 }] },
    },
  });

  await prisma.customField.createMany({
    data: [
      { organizationId: org.id, entity: "PARTICIPANT", key: "emergencyContact", label: "Notfallkontakt", fieldType: "TEXT", required: false },
      { organizationId: org.id, entity: "PARTICIPANT", key: "boardPreference", label: "Board-Präferenz", fieldType: "SELECT", options: ["soft", "hard"], required: false },
    ],
  });

  const waiver = await prisma.waiverTemplate.create({
    data: {
      organizationId: org.id,
      name: "Teilnahme- und Haftungserklärung",
      version: 1,
      body: "Ich bestätige, dass ich schwimmen kann und auf eigenes Risiko am Surfkurs teilnehme. Gesundheitsdaten werden nicht erhoben.",
      products: { create: [{ productId: anfaenger.id }, { productId: schnupper.id }, { productId: forti.id }, { productId: kids.id }, { productId: privat.id }] },
    },
  });

  await prisma.emailTemplate.createMany({
    data: [
      { organizationId: org.id, key: "booking.created", locale: "de", subject: "Buchung {{booking.number}} eingegangen", body: "Hallo {{customer.firstName}}, wir haben deine Buchung {{booking.number}} erhalten." },
      { organizationId: org.id, key: "booking.confirmed", locale: "de", subject: "Bestätigt: {{booking.number}}", body: "Hallo {{customer.firstName}}, deine Buchung {{booking.number}} am {{session.date}} um {{session.time}} in {{location.name}} ist bestätigt." },
      { organizationId: org.id, key: "booking.confirmed", locale: "en", subject: "Confirmed: {{booking.number}}", body: "Hi {{customer.firstName}}, booking {{booking.number}} on {{session.date}} at {{session.time}} in {{location.name}} is confirmed." },
      { organizationId: org.id, key: "booking.cancelled", locale: "de", subject: "Storno: {{booking.number}}", body: "Hallo {{customer.firstName}}, deine Buchung {{booking.number}} wurde storniert." },
      { organizationId: org.id, key: "waiver.missing", locale: "de", subject: "Waiver fehlt: {{booking.number}}", body: "Hallo {{customer.firstName}}, bitte unterschreibe die Teilnahmeerklärung für Buchung {{booking.number}} im Kundenportal." },
    ],
  });

  await prisma.automationRule.createMany({
    data: [
      { organizationId: org.id, name: "Erinnerung 48h", trigger: "session.upcoming", offsetHours: -48, action: "email.reminder", active: true },
      { organizationId: org.id, name: "Waiver-Check 24h", trigger: "session.upcoming", offsetHours: -24, action: "email.waiver_missing", active: true },
      { organizationId: org.id, name: "Follow-up 7 Tage", trigger: "session.completed", offsetHours: 168, action: "email.followup", active: false },
    ],
  });

  const sSchnupper = await prisma.courseSession.create({
    data: {
      organizationId: org.id,
      locationId: location.id,
      productId: schnupper.id,
      startsAt: at(today, 9),
      endsAt: at(today, 11),
      maxParticipants: 8,
      status: SessionStatus.CONFIRMED,
      instructors: { create: { instructorId: sarah.id } },
    },
  });
  const sAnfaenger = await prisma.courseSession.create({
    data: {
      organizationId: org.id,
      locationId: location.id,
      productId: anfaenger.id,
      startsAt: at(today, 10),
      endsAt: at(today, 12),
      maxParticipants: 8,
      status: SessionStatus.CONFIRMED,
      instructors: { create: { instructorId: tom.id } },
    },
  });
  const sForti = await prisma.courseSession.create({
    data: {
      organizationId: org.id,
      locationId: location.id,
      productId: forti.id,
      startsAt: at(today, 11, 30),
      endsAt: at(today, 13, 30),
      maxParticipants: 6,
      status: SessionStatus.CONFIRMED,
      instructors: { create: { instructorId: sarah.id } },
    },
  });
  const sKids = await prisma.courseSession.create({
    data: {
      organizationId: org.id,
      locationId: location.id,
      productId: kids.id,
      startsAt: at(today, 14),
      endsAt: at(today, 16),
      maxParticipants: 8,
      status: SessionStatus.CONFIRMED,
      instructors: { create: { instructorId: tom.id } },
    },
  });

  async function makeBooking(opts: {
    sessionId: string;
    productId: string;
    people: Array<{ first: string; last: string; age?: number; wetsuit?: string; waiver?: boolean }>;
    unitPrice: number;
    paid: boolean;
    paidAmount?: number;
    email: string;
    first: string;
    last: string;
  }) {
    const qty = opts.people.length;
    const total = qty * opts.unitPrice;
    const amountPaid = opts.paidAmount ?? (opts.paid ? total : 0);
    const paymentStatus = amountPaid <= 0 ? PaymentStatus.UNPAID : amountPaid < total ? PaymentStatus.PARTIALLY_PAID : PaymentStatus.PAID;
    const customer = await prisma.customer.create({
      data: {
        organizationId: org.id,
        firstName: opts.first,
        lastName: opts.last,
        email: opts.email,
        phone: "+49 151 000000",
      },
    });
    const booking = await prisma.booking.create({
      data: {
        organizationId: org.id,
        locationId: location.id,
        customerId: customer.id,
        number: `NSS-2026-${nanoid(6).toUpperCase()}`,
        status: BookingStatus.CONFIRMED,
        paymentStatus,
        accessToken: nanoid(32),
        subtotal: total,
        taxTotal: Math.round(total * 0.16 * 100) / 100,
        total,
        amountPaid,
        items: {
          create: {
            productId: opts.productId,
            sessionId: opts.sessionId,
            name: "Kurs",
            quantity: qty,
            unitPrice: opts.unitPrice,
            taxRate: 19,
            lineTotal: total,
            priceBreakdown: { appliedRules: [{ type: "STANDARD", effect: opts.unitPrice }] },
          },
        },
        statusHistory: { create: { to: BookingStatus.CONFIRMED, reason: "seed" } },
      },
    });
    if (amountPaid > 0) {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          provider: "mock",
          method: PaymentMethod.STRIPE,
          status: paymentStatus,
          amount: amountPaid,
          providerReference: `seed_${booking.id}`,
        },
      });
    }
    for (const person of opts.people) {
      const participant = await prisma.participant.create({
        data: {
          bookingId: booking.id,
          firstName: person.first,
          lastName: person.last,
          age: person.age,
          dateOfBirth: person.age ? new Date(2010, 0, 1) : new Date(1994, 4, 12),
          wetsuitSize: person.wetsuit ?? "M",
          canSwim: true,
          surfLevel: SurfLevel.BEGINNER,
        },
      });
      await prisma.sessionParticipant.create({
        data: { sessionId: opts.sessionId, participantId: participant.id, bookingId: booking.id },
      });
      if (person.waiver !== false) {
        await prisma.waiverSignature.create({
          data: {
            bookingId: booking.id,
            participantId: participant.id,
            templateId: waiver.id,
            templateVersion: 1,
            signerName: `${opts.first} ${opts.last}`,
            accepted: true,
            signatureData: "data:image/svg+xml;seed",
            ip: "127.0.0.1",
          },
        });
      }
    }
    return booking;
  }

  await makeBooking({
    sessionId: sAnfaenger.id,
    productId: anfaenger.id,
    unitPrice: 69,
    paid: true,
    email: "familie.meyer@example.com",
    first: "Max",
    last: "Meyer",
    people: [
      { first: "Max", last: "Meyer", wetsuit: "L" },
      { first: "Anna", last: "Meyer", wetsuit: "S" },
      { first: "Paul", last: "Meyer", age: 12, wetsuit: "XS" },
      { first: "Lisa", last: "Meyer", age: 10, wetsuit: "XS", waiver: false },
    ],
  });
  await makeBooking({
    sessionId: sAnfaenger.id,
    productId: anfaenger.id,
    unitPrice: 69,
    paid: true,
    email: "jonas.beck@example.com",
    first: "Jonas",
    last: "Beck",
    people: [
      { first: "Jonas", last: "Beck" },
      { first: "Mira", last: "Beck" },
      { first: "Tim", last: "Krüger" },
      { first: "Eva", last: "Krüger", waiver: false },
    ],
  });
  await makeBooking({
    sessionId: sSchnupper.id,
    productId: schnupper.id,
    unitPrice: 65,
    paid: true,
    paidAmount: 200,
    email: "clara.holm@example.com",
    first: "Clara",
    last: "Holm",
    people: [
      { first: "Clara", last: "Holm" },
      { first: "Nils", last: "Holm" },
      { first: "Ida", last: "Holm" },
      { first: "Ben", last: "Holm" },
    ],
  });
  await makeBooking({
    sessionId: sSchnupper.id,
    productId: schnupper.id,
    unitPrice: 59,
    paid: false,
    email: "open.one@example.com",
    first: "Open",
    last: "One",
    people: [
      { first: "Lea", last: "Open" },
      { first: "Jan", last: "Open" },
    ],
  });
  await makeBooking({
    sessionId: sForti.id,
    productId: forti.id,
    unitPrice: 80,
    paid: true,
    email: "kai.storm@example.com",
    first: "Kai",
    last: "Storm",
    people: [
      { first: "Kai", last: "Storm" },
      { first: "Nora", last: "Storm" },
      { first: "Pia", last: "Larsen" },
      { first: "Ole", last: "Larsen", waiver: false },
    ],
  });
  await makeBooking({
    sessionId: sKids.id,
    productId: kids.id,
    unitPrice: 73,
    paid: true,
    email: "eltern.kids@example.com",
    first: "Sven",
    last: "Kids",
    people: [
      { first: "Emil", last: "Kids", age: 9 },
      { first: "Mia", last: "Kids", age: 11 },
      { first: "Finn", last: "Kids", age: 10 },
      { first: "Lina", last: "Kids", age: 8 },
      { first: "Theo", last: "Kids", age: 12 },
    ],
  });

  const schedule: Array<{ productId: string; hour: number; minute?: number; instructorId: string; max: number }> = [
    { productId: schnupper.id, hour: 9, instructorId: sarah.id, max: 8 },
    { productId: anfaenger.id, hour: 10, instructorId: tom.id, max: 8 },
    { productId: forti.id, hour: 11, minute: 30, instructorId: sarah.id, max: 6 },
    { productId: kids.id, hour: 14, instructorId: tom.id, max: 8 },
    { productId: privat.id, hour: 15, instructorId: sarah.id, max: 2 },
  ];

  for (let day = 1; day <= 7; day++) {
    const date = addDays(today, day);
    for (const slot of schedule) {
      const startsAt = at(date, slot.hour, slot.minute ?? 0);
      const product = [schnupper, anfaenger, forti, kids, privat].find((p) => p.id === slot.productId)!;
      const session = await prisma.courseSession.create({
        data: {
          organizationId: org.id,
          locationId: location.id,
          productId: slot.productId,
          startsAt,
          endsAt: addMinutes(startsAt, product.durationMinutes),
          maxParticipants: slot.max,
          status: SessionStatus.PLANNED,
          instructors: { create: { instructorId: slot.instructorId } },
        },
      });
      if (day <= 3 && slot.productId !== privat.id) {
        await makeBooking({
          sessionId: session.id,
          productId: slot.productId,
          unitPrice: Number(product.basePrice),
          paid: true,
          email: `future.${day}.${slot.hour}@example.com`,
          first: "Future",
          last: `Guest${day}`,
          people: [
            { first: "Alex", last: `D${day}` },
            { first: "Sam", last: `D${day}` },
          ],
        });
      }
    }
  }

  await prisma.waitlistEntry.create({
    data: {
      organizationId: org.id,
      sessionId: sAnfaenger.id,
      email: "warte@example.com",
      firstName: "Kim",
      lastName: "Warte",
      participants: 1,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      userId: admin.id,
      action: "seed",
      entityType: "Organization",
      entityId: org.id,
      newValue: { demo: true },
    },
  });

  console.log("Seed complete: North Sea Surf School / Nordstrand");
  console.log("Login: admin@northseasurf.example / SurfDemo!2026");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
