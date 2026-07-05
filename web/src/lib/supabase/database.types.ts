// database.types.ts — Supabase gen types 자동 산출물 placeholder
// 슬라이스 #2(migration) 완료 후:
//   supabase gen types typescript --local > web/src/lib/supabase/database.types.ts
// 으로 대체한다. 이 파일을 손으로 편집하지 말 것.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
