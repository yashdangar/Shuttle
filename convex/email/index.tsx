// IMPORTANT: this is a Convex Node Action
"use node";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { render, pretty } from "@react-email/render";
import { Resend } from "resend";

export const sendAccountCredentialsEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("frontdesk"),
      v.literal("driver")
    ),
    loginUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const nodeEnv = process.env.NODE_ENV;

    if (nodeEnv !== "production") {
      console.log(
        `[Email] Skipping email send in ${nodeEnv} environment. Would send to: ${args.to}`
      );
      return { success: true, skipped: true, environment: nodeEnv };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    const resend = new Resend(apiKey);

    const { AccountCredentialsEmail } = await import("./emailTemplates");

    const html = await pretty(
      await render(
        AccountCredentialsEmail({
          name: args.name,
          email: args.email,
          password: args.password,
          role: args.role,
          loginUrl: args.loginUrl,
        })
      )
    );

    const result = await resend.emails.send({
      from: "Shuttle Management <onboarding@resend.dev>",
      to: args.to,
      subject: args.subject,
      html,
    });

    if (result.error) {
      throw new Error(`Failed to send email: ${result.error.message}`);
    }

    return { success: true, id: result.data?.id };
  },
});
