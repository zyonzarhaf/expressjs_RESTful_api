import * as User from '../../models/user.js';
import jwtSignAsync from '../../utils/jwtSignAsync.js';
import tryCatchWrapper from '../../utils/tryCatchWrapper.js';
import httpStatus from 'http-status-codes';
import APIError from '../../errors/APIError.js';

const register = tryCatchWrapper(async function (req, res, next) {
    try {
        const user = await User.create(req.body);
        res.status(httpStatus.CREATED).json({ user });
    } catch (err) {
        throw new APIError({
            message: `Duplicate value(s): ${Object.keys(err.keyValue)} already taken`,
            status: httpStatus.CONFLICT
        });
    }
});

const update = tryCatchWrapper(async function (req, res, next) {
    const { userId: _id } = req.params;
    const user = await User.update({ _id }, req.body);

    if (!user) throw new APIError({
        message: 'User not found',
        status: httpStatus.NOT_FOUND
    });

    res.status(httpStatus.OK).json({ user });
});

const remove = tryCatchWrapper(async function (req, res, next) {
    const { userId: _id } = req.params;
    const result = await User.remove({ _id });

    if (!result.deletedCount) throw new APIError({
        message: 'User not found',
        status: httpStatus.NOT_FOUND
    });

    res.status(httpStatus.OK).json({ success: true });
});

const get = tryCatchWrapper(async function (req, res, next) {
    const { userId: _id } = req.params;
    const user = await User.get({ _id });

    if (!user) throw new APIError({
        message: 'User not found',
        status: httpStatus.NOT_FOUND
    });

    res.status(httpStatus.OK).json({ user });
});

const list = tryCatchWrapper(async function (req, res, next) {
    const { offset, limit } = req.query;
    const users = await User.list({ offset, limit });

    /**
    * Retorna uma lista vazia se não forem 
    * encontrados documentos na coleção
    * */
    res.status(httpStatus.OK).json({ users });
});

const login = tryCatchWrapper(async function (req, res, next) {
    const { email, password } = req.body;
    const user = await User.get({ email });

    if (!user || !User.verifyPassword(password, user.password, user.salt)) {
        throw new APIError({
            message: 'Incorrect email or password',
            status: httpStatus.UNAUTHORIZED
        });
    }

    const payload = {
        sub: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        iat: Date.now()
    };

    const accessToken = await jwtSignAsync(payload, process.env.JWT_SECRET, { expiresIn: '60min' });
    const refreshToken = await jwtSignAsync(payload, process.env.JWT_REFRESH_SECRET);

    user.refreshTokens.push(refreshToken); 
    await user.save();

    res.json({ accessToken, refreshToken });
});

const logout = tryCatchWrapper(async function (req, res, next) {
    const { id } = req.user;
    await User.update({ _id: id }, { refreshTokens: [] });

    res.json({ success: true });
});

const refreshAccessToken = tryCatchWrapper(async function (req, res, next) {
    const { token } = req.body;

    if (!token) throw new APIError({
        message: 'missing token',
        status: httpStatus.UNAUTHORIZED
    });

    const user = await User.get({ refreshTokens: token });

    if (!user) throw new APIError({
        message: 'invalid token',
        status: httpStatus.FORBIDDEN
    });

    const payload = {
        sub: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        iat: Date.now()
    };

    const accessToken = jwtSignAsync(payload, process.env.JWT_SECRET, { expiresIn: '60min' });

    res.json({ accessToken });
});

export { 
    register,
    update,
    remove,
    get,
    list,
    login,
    logout,
    refreshAccessToken
};
