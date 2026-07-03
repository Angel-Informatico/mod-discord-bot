import express from 'express';
import passport from 'passport';
import Client from '@/structures/Client';
import ms from 'ms';
import PremiumKeySchema from '@/database/schemas/PremiumKeySchema';
import UserSchema from '@/database/schemas/UserSchema';
import GuildSchema from '@/database/schemas/GuildSchema';
const router = express.Router();

function checkOwner(req, res, next) {
    if (!req.user || !req.user.id || !req.user.email) {
        return res.redirect('/');
    }

    const ownerIdsStr = process.env.OWNER_IDS;
    const ownerEmailsStr = process.env.OWNER_EMAILS;

    if (!ownerIdsStr || !ownerEmailsStr) {
        return res.status(403).render('error.ejs', { error: '403 Forbidden - Configuración de dueño incompleta.' });
    }

    const ownerIds = ownerIdsStr.split(',');
    const ownerEmails = ownerEmailsStr.split(',');

    if (ownerIds.includes(req.user.id) && ownerEmails.includes(req.user.email)) {
        next();
    } else {
        return res.status(403).render('error.ejs', { error: '403 Forbidden - No tienes permisos de dueño.' });
    }
}

router.use(checkOwner);

router.get('/', async (req, res) => {
    const bot = res.locals.bot as Client;

    // Obtener estadísticas globales y lista de servidores
    const guilds = bot.guilds.cache.map(g => ({
        id: g.id,
        name: g.name,
        memberCount: g.memberCount,
        icon: g.iconURL()
    })).sort((a, b) => b.memberCount - a.memberCount);

    res.render('owner/dashboard.ejs', {
        guilds,
        totalGuilds: bot.guilds.cache.size,
        totalUsers: bot.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
        ping: bot.ws.ping
    });
});

router.get('/premium', async (req, res) => {
    // Ver claves generadas y no reclamadas (limitado a 100)
    const generatedKeys = await PremiumKeySchema.find({}).sort({ _id: -1 }).limit(100);

    const bot = res.locals.bot as Client;

    // Ver usuarios con premium activo (limitado a 100)
    const premiumUsersRaw = await UserSchema.find({ premium: { $gt: Date.now() } }).limit(100);
    const premiumUsers = await Promise.all(premiumUsersRaw.map(async u => {
        let user = bot.users.cache.get(u.userId);
        if (!user) {
            try { user = await bot.users.fetch(u.userId); } catch (e) {}
        }
        return {
            id: u.userId,
            name: user ? user.username : 'Desconocido',
            avatar: user ? user.displayAvatarURL() : null,
            expiresAt: u.premium
        };
    }));

    // Ver servidores con premium activo (limitado a 100)
    const premiumGuildsRaw = await GuildSchema.find({ premium: { $gt: Date.now() } }).limit(100);
    const premiumGuilds = premiumGuildsRaw.map(g => {
        const guild = bot.guilds.cache.get(g.guildId);
        return {
            id: g.guildId,
            name: guild ? guild.name : 'Desconocido',
            icon: guild ? guild.iconURL() : null,
            expiresAt: g.premium
        };
    });

    res.render('owner/premium.ejs', {
        generatedKeys,
        premiumUsers,
        premiumGuilds,
        bot: res.locals.bot
    });
});

router.post('/premium/generate', async (req, res) => {
    try {
        const { duration, type } = req.body;
        
        const msTime = ['infinito', 'infinite'].includes(duration.toLowerCase()) 
            ? Number(ms('100y')) 
            : Number(ms(duration));

        if (!msTime || msTime <= 0) {
            req.flash('error', 'Duración inválida. (Usa ej: 1d, 30d, 1y, infinite)');
            return res.redirect('/owner/premium');
        }

        const selectedType = type === 'guild' ? 'guild' : 'user';
        const key = generateRandomKey();

        await new PremiumKeySchema({
            key,
            expiration: msTime,
            type: selectedType
        }).save();

        req.flash('success', `Clave generada exitosamente: ${key}`);
        res.redirect('/owner/premium');
    } catch (e) {
        console.error(e);
        req.flash('error', 'Ocurrió un error generando la clave.');
        res.redirect('/owner/premium');
    }
});

function generateRandomKey() {
    const posiblidades = 'ABCDEFGHIJLKMNOPQRSTUVWXYZ0123456789';
    let parte1 = ''; let parte2 = ''; let parte3 = ''; let parte4 = '';
    for (let i = 0; i < 4; i++) {
       parte1 += posiblidades.charAt(Math.floor(Math.random() * posiblidades.length));
       parte2 += posiblidades.charAt(Math.floor(Math.random() * posiblidades.length));
       parte3 += posiblidades.charAt(Math.floor(Math.random() * posiblidades.length));
       parte4 += posiblidades.charAt(Math.floor(Math.random() * posiblidades.length));
    }
    return `${parte1}-${parte2}-${parte3}-${parte4}`;
}

export default router;
