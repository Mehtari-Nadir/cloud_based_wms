import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
    path: "/clerk-webhook",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
        const payload = await req.json();
        const eventType = payload.type;

        if (eventType === "user.created" || eventType === "user.updated") {
            const { id, email_addresses, first_name, last_name } = payload.data;

            const email = email_addresses?.[0]?.email_address ?? "";
            const name = [first_name, last_name].filter(Boolean).join(" ") || "Unknown";

            await ctx.runMutation(internal.users.upsertUser, {
                clerkId: id,
                name,
                email,
            });
        }

        if (eventType === "user.deleted") {
            const { id } = payload.data;
            await ctx.runMutation(internal.users.deleteUser, {
                clerkId: id,
            });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }),
});

export default http;