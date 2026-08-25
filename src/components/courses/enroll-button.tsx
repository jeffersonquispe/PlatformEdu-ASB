"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { enrollFreeCourseAction } from "@/lib/actions/enrollments";

interface EnrollButtonProps {
  courseId: string;
  price: number;
  isEnrolled: boolean;
  isAuthenticated: boolean;
  firstLessonHref: string | null;
}

export function EnrollButton({
  courseId,
  price,
  isEnrolled,
  isAuthenticated,
  firstLessonHref,
}: EnrollButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isEnrolled) {
    return (
      <Button
        size="lg"
        className="w-full"
        render={<Link href={firstLessonHref ?? "/estudiante"}>Continuar aprendiendo</Link>}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <Button
        size="lg"
        className="w-full"
        render={<Link href="/login">Inicia sesión para inscribirte</Link>}
      />
    );
  }

  if (price === 0) {
    return (
      <div className="space-y-2">
        <Button
          size="lg"
          className="w-full"
          data-testid="enroll-free"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await enrollFreeCourseAction(courseId);
              if (result?.error) setError(result.error);
            })
          }
        >
          {pending ? "Inscribiendo..." : "Inscribirme gratis"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <Button
      size="lg"
      className="w-full"
      render={<Link href={`/checkout/${courseId}`}>Comprar curso</Link>}
    />
  );
}
