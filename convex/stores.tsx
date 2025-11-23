import { query } from "./_generated/server";

const getStores = query({
    args: {},
    handler: async (ctx) => {
        const stores = await ctx.db.query("stores").collect();
        return stores;
    }
});