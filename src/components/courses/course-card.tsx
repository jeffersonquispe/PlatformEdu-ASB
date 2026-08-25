import Image from "next/image";
import Link from "next/link";
import { Star, Users } from "lucide-react";
import { LevelBadge } from "@/components/courses/level-badge";
import { cn, formatCurrency } from "@/lib/utils";
import type { CourseWithInstructor } from "@/types/database";

interface CourseCardProps {
  course: CourseWithInstructor;
  layout?: "grid" | "list";
}

export function CourseCard({ course, layout = "grid" }: CourseCardProps) {
  const isList = layout === "list";

  return (
    <Link
      href={`/cursos/${course.slug}`}
      data-testid="course-card"
      data-course-slug={course.slug}
      className={cn(
        "group flex overflow-hidden rounded-xl border transition-shadow hover:shadow-md",
        isList ? "flex-row" : "flex-col",
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-muted",
          isList ? "aspect-video w-32 sm:w-56" : "aspect-video w-full",
        )}
      >
        {course.thumbnail_url ? (
          <Image
            src={course.thumbnail_url}
            alt={course.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes={isList ? "224px" : "(max-width: 768px) 100vw, 320px"}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs text-muted-foreground sm:text-sm">
            {course.category}
          </div>
        )}
      </div>
      <div className={cn("flex flex-1 flex-col gap-2 p-4", isList && "justify-center")}>
        <LevelBadge level={course.level} className="w-fit" />
        <h3 className="line-clamp-2 font-semibold leading-snug">{course.title}</h3>
        <p className="line-clamp-1 text-sm text-muted-foreground">
          {course.instructor?.full_name ?? "Instructor"}
        </p>
        <div className={cn("flex items-center justify-between", isList ? "mt-1" : "mt-auto pt-2")}>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {course.rating_count > 0 && (
              <span className="flex items-center gap-1">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                {course.rating_average.toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {course.student_count}
            </span>
          </div>
          <span className="font-semibold">{formatCurrency(course.price)}</span>
        </div>
      </div>
    </Link>
  );
}
