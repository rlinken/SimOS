import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { GraduationCap, Calendar, User, Check } from "lucide-react";
import { format } from "date-fns";
import type { Lesson, User as UserType } from "@shared/schema";

export default function LessonsPage() {
  const { data: lessons, isLoading } = useQuery<
    (Lesson & { instructor: UserType; student: UserType })[]
  >({
    queryKey: ["/api/lessons"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Lessons</h1>
        </div>
        <Card className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Lessons
        </h1>
        <p className="text-muted-foreground">
          Manage golf instruction sessions
        </p>
      </div>

      {/* Lessons List */}
      {!lessons || lessons.length === 0 ? (
        <Card className="p-12 text-center">
          <GraduationCap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No lessons scheduled</h3>
          <p className="text-muted-foreground">
            Lessons will appear here once scheduled
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {lessons.map((lesson) => (
            <Card
              key={lesson.id}
              className="p-6 hover-elevate"
              data-testid={`card-lesson-${lesson.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold">{lesson.title}</h3>
                    {lesson.completed && (
                      <div className="px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Completed
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span className="font-mono">
                        {format(new Date(lesson.date), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>
                        Instructor: {lesson.instructor?.firstName}{" "}
                        {lesson.instructor?.lastName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>
                        Student: {lesson.student?.firstName}{" "}
                        {lesson.student?.lastName}
                      </span>
                    </div>
                  </div>

                  {lesson.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">
                        {lesson.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
