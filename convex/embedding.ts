"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Id } from "./_generated/dataModel";

// Initialize Google AI with API key from environment
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

// Generate embedding for a text string using Google's embedding model
async function generateEmbedding(text: string): Promise<number[]> {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
}

// Internal action to generate and store embedding for a product
export const generateProductEmbedding = internalAction({
    args: {
        productId: v.id("products"),
        name: v.string(),
        description: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        // Generate embedding from name + description
        const textToEmbed = `${args.name}. ${args.description || ""}`;
        const embedding = await generateEmbedding(textToEmbed);

        // Store the embedding on the product
        await ctx.runMutation(internal.embeddingHelpers.updateProductEmbedding, {
            productId: args.productId,
            embedding,
        });

        return null;
    },
});

// Public action for semantic search
export const semanticSearch = action({
    args: {
        query: v.string(),
        clerkId: v.string(),
    },
    returns: v.array(
        v.object({
            _id: v.id("products"),
            name: v.string(),
            sku: v.string(),
            description: v.string(),
            quantity: v.number(),
            unit: v.string(),
            storeName: v.string(),
            warehouseName: v.string(),
            imageUrl: v.union(v.string(), v.null()),
        })
    ),
    handler: async (ctx, args) => {
        // Generate embedding for the search query
        const queryEmbedding = await generateEmbedding(args.query);

        // Get user's accessible store IDs
        const accessibleStoreIds: Id<"stores">[] = await ctx.runQuery(
            internal.embeddingHelpers.getUserAccessibleStoreIds,
            { clerkId: args.clerkId }
        );

        if (accessibleStoreIds.length === 0) {
            return [];
        }

        // Perform vector search for each store and combine results
        const allResults: Array<{
            _id: Id<"products">;
            name: string;
            sku: string;
            description: string;
            quantity: number;
            unit: string;
            storeName: string;
            warehouseName: string;
            imageUrl: string | null;
        }> = [];

        // Search across all accessible stores
        for (const storeId of accessibleStoreIds) {
            const results = await ctx.vectorSearch("products", "by_embedding", {
                vector: queryEmbedding,
                limit: 10,
                filter: (q) => q.eq("storeId", storeId),
            });

            // Get full product details for each result
            for (const result of results) {
                const productDetails = await ctx.runQuery(
                    internal.embeddingHelpers.getProductDetails,
                    { productId: result._id }
                );
                if (productDetails) {
                    allResults.push(productDetails);
                }
            }
        }

        // Remove duplicates and limit to 20 results
        const uniqueResults = allResults.filter(
            (item, index, self) =>
                index === self.findIndex((t) => t._id === item._id)
        );

        return uniqueResults.slice(0, 20);
    },
});

// Migration action to generate embeddings for all existing products
export const migrateExistingProducts = action({
    args: {},
    returns: v.object({
        processed: v.number(),
        errors: v.number(),
    }),
    handler: async (ctx) => {
        // Get all products without embeddings
        const productsToMigrate = await ctx.runQuery(
            internal.embeddingHelpers.getProductsWithoutEmbeddings,
            {}
        );

        let processed = 0;
        let errors = 0;

        for (const product of productsToMigrate) {
            try {
                // Generate embedding from name + description
                const textToEmbed = `${product.name}. ${product.description || ""}`;
                const embedding = await generateEmbedding(textToEmbed);

                // Store the embedding on the product
                await ctx.runMutation(internal.embeddingHelpers.updateProductEmbedding, {
                    productId: product._id,
                    embedding,
                });

                processed++;
                console.log(`Generated embedding for product: ${product.name}`);
            } catch (error) {
                errors++;
                console.error(`Failed to generate embedding for ${product.name}:`, error);
            }
        }

        return { processed, errors };
    },
});
