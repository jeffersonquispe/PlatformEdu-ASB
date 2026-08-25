import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, Users, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CourseCurriculum } from "@/components/courses/course-curriculum";
import { LevelBadge } from "@/components/courses/level-badge";
import { ReviewList } from "@/components/courses/review-list";
import { ReviewForm } from "@/components/courses/review-form";
import { EnrollButton } from "@/components/courses/enroll-button";
import { getCourseBySlug, getFirstLessonId } from "@/lib/queries/courses";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDuration, courseLevelLabel } from "@/lib/utils";

interface CourseDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CourseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCourseBySlug(slug);
  if (!result) {
    return { title: "Curso no encontrado", robots: { index: false, follow: false } };
  }

  const { course } = result;
  const description =
    course.short_description ??
    course.description?.slice(0, 155) ??
    `Curso de ${course.category} en EduPlatform.`;

  return {
    title: course.title,
    description,
    alternates: { canonical: `/cursos/${course.slug}` },
    openGraph: {
      title: course.title,
      description,
      type: "article",
      images: course.thumbnail_url
        ? [{ url: course.thumbnail_url, alt: `Portada del curso ${course.title}` }]
        : undefined,
    },
  };
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { slug } = await params;
  const result = await getCourseBySlug(slug);
  if (!result) notFound();

  const { course, sections, reviews, isEnrolled } = result;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstLessonId = isEnrolled ? await getFirstLessonId(course.id) : null;
  const totalSeconds = sections.reduce(
    (acc, section) => acc + section.lessons.reduce((sum, lesson) => sum + lesson.duration_seconds, 0),
    0,
  );

  let existingReview: { rating: number; comment: string | null } | null = null;
  if (isEnrolled && user) {
    const { data } = await supabase
      .from("reviews")
      .select("rating, comment")
      .eq("student_id", user.id)
      .eq("course_id", course.id)
      .maybeSingle();
    existingReview = data;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const courseUrl = `${siteUrl}/cursos/${course.slug}`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Cursos", item: `${siteUrl}/cursos` },
      { "@type": "ListItem", position: 3, name: course.title, item: courseUrl },
    ],
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.short_description ?? course.description ?? undefined,
    inLanguage: "es",
    url: courseUrl,
    image: course.thumbnail_url ?? undefined,
    educationalLevel: courseLevelLabel(course.level),
    provider: { "@type": "Organization", name: "EduPlatform" },
    ...(course.instructor?.full_name
      ? { instructor: { "@type": "Person", name: course.instructor.full_name } }
      : {}),
    ...(course.rating_count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: course.rating_average,
            reviewCount: course.rating_count,
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      price: course.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <nav aria-label="Ruta de navegación" className="mx-auto max-w-7xl px-4 pt-6">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link
              href="/"
              className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href="/cursos"
              className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cursos
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">
            {course.title}
          </li>
        </ol>
      </nav>

      <section aria-labelledby="course-title" className="border-b bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Badge variant="secondary">{course.category}</Badge>
            <h1 id="course-title" className="text-3xl font-bold tracking-tight text-balance">
              {course.title}
            </h1>
            <p className="text-lg text-muted-foreground text-balance">{course.short_description}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {course.rating_count > 0 && (
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                  {course.rating_average.toFixed(1)}
                  <span className="sr-only">de 5 estrellas,</span> ({course.rating_count} reseñas)
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="size-4" aria-hidden="true" /> {course.student_count} estudiantes
              </span>
              <LevelBadge level={course.level} />
              {totalSeconds > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="size-4" aria-hidden="true" />
                  <span className="sr-only">Duración total:</span> {formatDuration(totalSeconds)}
                </span>
              )}
            </div>
            {course.instructor && (
              <div className="flex items-center gap-3 pt-2">
                <Avatar>
                  <AvatarImage
                    src={course.instructor.avatar_url ?? undefined}
                    alt={`Foto de ${course.instructor.full_name ?? "el instructor"}`}
                  />
                  <AvatarFallback aria-hidden="true">
                    {(course.instructor.full_name ?? "I")[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-muted-foreground">Creado por</p>
                  <p className="font-medium">{course.instructor.full_name}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          <section aria-labelledby="course-description">
            <h2 id="course-description" className="mb-4 text-xl font-semibold">
              Descripción
            </h2>
            <p className="whitespace-pre-line text-muted-foreground">{course.description}</p>
          </section>

          <section aria-labelledby="course-curriculum">
            <h2 id="course-curriculum" className="mb-4 text-xl font-semibold">
              Temario del curso
            </h2>
            <CourseCurriculum sections={sections} isEnrolled={isEnrolled} />
          </section>

          <section aria-labelledby="course-reviews" className="space-y-6">
            <h2 id="course-reviews" className="text-xl font-semibold">
              Reseñas de estudiantes
            </h2>
            {isEnrolled && (
              <ReviewForm courseId={course.id} slug={course.slug} existingReview={existingReview ?? undefined} />
            )}
            <ReviewList
              reviews={reviews.map((review) => ({
                ...review,
                student: (review as unknown as { student: { full_name: string | null; avatar_url: string | null } }).student,
              }))}
            />
          </section>
        </div>

        <aside aria-labelledby="enroll-heading" className="lg:col-span-1">
          <h2 id="enroll-heading" className="sr-only">
            Inscripción al curso
          </h2>
          <div className="sticky top-24 space-y-4 rounded-xl border p-5 shadow-sm">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
              {course.thumbnail_url && (
                <Image
                  src={course.thumbnail_url}
                  alt={`Portada del curso ${course.title}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover"
                />
              )}
            </div>
            <p className="text-3xl font-bold">
              <span className="sr-only">Precio:</span> {formatCurrency(course.price)}
            </p>
            <EnrollButton
              courseId={course.id}
              price={course.price}
              isEnrolled={isEnrolled}
              isAuthenticated={Boolean(user)}
              firstLessonHref={firstLessonId ? `/aprender/${course.id}/${firstLessonId}` : null}
            />
            <p className="text-center text-xs text-muted-foreground">
              Acceso de por vida · Certificado al completar el curso
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
