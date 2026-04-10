// api.js

const API_BASE = 'https://dummyjson.com/products?limit=0';
const CACHE_KEY = 'intellishop_products_v13';

export let searchIndex = null;
export let categories = [];

export async function fetchProducts() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.length > 0) {
                initSearchIndex(parsed);
                extractCategories(parsed);
                return parsed;
            }
        }

        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error('API fetch failed');
        const data = await res.json();
        
        // Exclude unwanted non-fashion categories
        const excludedCategories = new Set([
            'groceries', 'furniture', 'home-decoration', 'kitchen-accessories', 
            'laptops', 'motorcycle', 'smartphones', 'tablets', 'vehicle', 'mobile-accessories'
        ]);

        const fashionData = data.products.filter(p => !excludedCategories.has(p.category));

        // Augment DummyJSON data to fit eCommerce needs
        const products = fashionData.map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            price: p.price,
            discountPrice: Math.round(p.price * (1 - p.discountPercentage/100)),
            priceInRupees: Math.round(p.price * 80),
            discountPriceInRupees: Math.round(p.price * 80 * (1 - p.discountPercentage/100)),
            category: p.category,
            brand: p.brand || 'Generic',
            rating: p.rating,
            reviewCount: Math.floor(Math.random() * 500) + 10,
            image: p.thumbnail,
            images: p.images,
            colors: ['Red', 'Blue', 'Black', 'White', 'Green'].slice(0, Math.floor(Math.random() * 3) + 1),
            sizes: ['S', 'M', 'L', 'XL', 'XXL'].slice(0, Math.floor(Math.random() * 4) + 1),
            stock: p.stock
        }));

        const generatedDresses = [];
        const styles = ['Bohemian', 'Elegant', 'Casual', 'Vintage', 'Modern', 'Chic', 'Glamorous', 'Minimalist', 'Retro', 'Romantic'];
        const materials = ['Silk', 'Cotton', 'Linen', 'Velvet', 'Chiffon', 'Satin', 'Lace', 'Crepe', 'Tulle', 'Tweed'];
        const types = ['Maxi Dress', 'Midi Dress', 'Wrap Dress', 'Bodycon Dress', 'A-Line Dress', 'Shift Dress', 'Slip Dress', 'Halter Dress', 'Peplum Dress', 'Shirt Dress'];
        const brands = ['Zara', 'H&M', 'Celine', 'Gucci', 'Prada', 'Mango', 'Reformation', 'Realisation Par', 'ASOS', 'Topshop'];
        
        const dressImageIds = [
            '1496747611176-843222e1e57c', '1566160983994-dbb174bf94ab', '1515347619252-78d910dc86a8',
            '1595777457583-95e059f581ce', '1515886657613-9f3515b0c78f', '1585487000160-6ebcfceb0d03',
            '1583391733958-d15f110826ed', '1572804013309-84aeb5b3671f', '1550639524-a6f58345a278',
            '1551163943-3f6a855d1153', '1612336307429-8a898d10e223', '1511130558090-00af591618b7',
            '1520112108745-0d2a45d0af9b', '1502715764020-f5a63969185a'
        ];

        let index = 0;
        for (let s = 0; s < styles.length; s++) {
            for (let m = 0; m < materials.length; m++) {
                if (index >= 100) break;
                const t = index % types.length;
                const b = index % brands.length;
                const img = dressImageIds[index % dressImageIds.length];
                
                const title = `${styles[s]} ${materials[m]} ${types[t]}`;
                const rawPrice = Math.floor(Math.random() * 200) + 40;
                
                generatedDresses.push({
                    id: 3000 + index,
                    title: title,
                    description: `Experience the finest with our carefully crafted ${title}. Designed by ${brands[b]} to fit flawlessly and elevate your everyday fashion. Made from 100% premium ${materials[m]} materials.`,
                    price: rawPrice,
                    discountPrice: Math.round(rawPrice * 0.85),
                    priceInRupees: Math.round(rawPrice * 80),
                    discountPriceInRupees: Math.round(rawPrice * 80 * 0.85),
                    category: 'womens-dresses',
                    brand: brands[b],
                    rating: (Math.random() * 1.0 + 4.0).toFixed(1),
                    reviewCount: Math.floor(Math.random() * 500) + 20,
                    image: `https://images.unsplash.com/photo-${img}?auto=format&fit=crop&w=500&q=80`,
                    images: [`https://images.unsplash.com/photo-${img}?auto=format&fit=crop&w=500&q=80`],
                    colors: ['Red', 'Blue', 'Black', 'White', 'Pink'].slice(0, Math.floor(Math.random() * 3) + 1),
                    sizes: ['S', 'M', 'L', 'XL'].slice(0, Math.floor(Math.random() * 4) + 1),
                    stock: Math.floor(Math.random() * 50) + 5
                });
                index++;
            }
        }

        const allProducts = [...products, ...generatedDresses];
        localStorage.setItem(CACHE_KEY, JSON.stringify(allProducts));
        initSearchIndex(allProducts);
        extractCategories(allProducts);
        return allProducts;
    } catch (e) {
        console.error('Fetch products error:', e);
        return [];
    }
}


function initSearchIndex(products) {
    if (window.Fuse) {
        const options = {
            keys: ['title', 'category', 'brand'],
            threshold: 0.3
        };
        searchIndex = new window.Fuse(products, options);
    }
}

function extractCategories(products) {
    const cats = new Set(products.map(p => p.category));
    categories.length = 0;
    categories.push(...Array.from(cats));
}

export function searchProducts(query) {
    if (!searchIndex || !query) return [];
    return searchIndex.search(query).map(result => result.item);
}
