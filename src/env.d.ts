/// <reference types="@clerk/astro/env" />

import type { User } from "@/lib/types/user.ts";

declare global {
  namespace App {
    interface Locals {
      userId: string;
      createdAt: string;
      user: User;
    }
  }
}

export {};
