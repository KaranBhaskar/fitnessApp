import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "./_generated/dataModel";
import { ensureAppProfileForUser } from "./profileBootstrap";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, args) {
      await ensureAppProfileForUser(
        ctx as unknown as GenericMutationCtx<DataModel>,
        {
          userId: args.userId as Id<"users">,
          profile: args.profile,
        },
      );
    },
  },
});
