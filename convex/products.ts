import { query } from "./_generated/server";

const getProducts = query({
    args: {},
    handler: async (ctx) => {
        const products = await ctx.db.query("products").collect();
        return products;
    }
});