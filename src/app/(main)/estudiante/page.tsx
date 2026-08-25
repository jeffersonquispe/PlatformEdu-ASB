import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Award, Download, GraduationCap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { getStudentDashboardData } from "@/lib/queries/student-dashboard";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Mi aprendizaje" };

export default async function StudentDashboardPage() {
  const data = await getStudentDashboardData();
  if (!data) return null;

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold tracking-tight">Mi aprendizaje</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard icon={GraduationCap} label="Cursos completados" value={String(data.completed.length)} />
        <StatCard icon={Award} label="Certificados" value={String(data.certificates.length)} />
      </div>

      <section data-testid="cursos-en-progreso">
        <h2 className="mb-4 text-lg font-semibold">En progreso</h2>
        {data.inProgress.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tienes cursos en progreso.{" "}
            <Link href="/cursos" className="underline underline-offset-4">
              Explora el catálogo
            </Link>
            .
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.inProgress.map((enrollment) =>
              enrollment.course ? (
                <Link
                  key={enrollment.id}
                  href={`/cursos/${enrollment.course.slug}`}
                  data-testid="enrolled-course"
                  data-course-slug={enrollment.course.slug}
                  className="overflow-hidden rounded-xl border hover:shadow-md"
                >
                  <div className="relative aspect-video bg-muted">
                    {enrollment.course.thumbnail_url && (
                      <Image
                        src={enrollment.course.thumbnail_url}
                        alt={enrollment.course.title}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="line-clamp-2 font-medium">{enrollment.course.title}</p>
                    <Progress value={enrollment.progress_percent} />
                    <p className="text-xs text-muted-foreground">{enrollment.progress_percent}% completado</p>
                  </div>
                </Link>
              ) : null,
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Completados</h2>
        {data.completed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no has completado ningún curso.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.completed.map((enrollment) =>
              enrollment.course ? (
                <Link
                  key={enrollment.id}
                  href={`/cursos/${enrollment.course.slug}`}
                  className="flex items-center gap-3 rounded-xl border p-4 hover:shadow-md"
                >
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                    {enrollment.course.thumbnail_url && (
                      <Image
                        src={enrollment.course.thumbnail_url}
                        alt={enrollment.course.title}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <p className="line-clamp-2 font-medium">{enrollment.course.title}</p>
                    <Badge variant="secondary" className="mt-1">
                      Completado
                    </Badge>
                  </div>
                </Link>
              ) : null,
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Certificados</h2>
        {data.certificates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no obtienes certificados.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {data.certificates.map((certificate) => (
              <li key={certificate.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div className="flex items-center gap-3">
                  <Award className="size-5 text-primary" />
                  <div>
                    <p className="font-medium">{certificate.course?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Emitido el{" "}
                      {new Date(certificate.issued_at).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <a
                  href={`/api/certificates/${certificate.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  <Download className="size-4" /> Descargar
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Historial de compras</h2>
        {data.enrollments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no has comprado ningún curso.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {data.enrollments.map((enrollment) => (
              <div key={enrollment.id} className="flex items-center justify-between p-4 text-sm">
                <span>{enrollment.course?.title}</span>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>{new Date(enrollment.purchased_at).toLocaleDateString("es-ES")}</span>
                  <span className="font-medium text-foreground">{formatCurrency(enrollment.amount_paid)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
