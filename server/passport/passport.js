import passport from "passport";
import passportLocal from "passport-local";
import passportJWT from "passport-jwt";
import bcrypt from "bcrypt";
import User from "../models/user.js";

passport.use(
	"login",
	new passportLocal.Strategy(
		{
			usernameField: "account",
			passwordField: "password"
		},
		async (account, password, done) => {
			try {
				console.log("Passport 登入策略:", { account });

				if (!account || !password) {
					console.log("缺少登入憑證");
					return done(null, null, { message: "請輸入帳號和密碼" });
				}

				const user = await User.findOne({ account }).select("+password");
				if (!user) {
					console.log("找不到用戶:", { account });
					throw new Error("ACCOUNT");
				}

				console.log("找到用戶, 準備驗證密碼:", { account, userExists: !!user, password: !!password });

				try {
					const passwordMatch = bcrypt.compareSync(password, user.password);
					console.log("密碼驗證:", { account, passwordMatch });

					if (!passwordMatch) {
						throw new Error("PASSWORD");
					}

					console.log("登入成功:", { account, _id: user._id });
					return done(null, user, null);
				} catch (passwordError) {
					console.error("密碼驗證過程中出錯:", passwordError);
					if (passwordError.message === "PASSWORD") {
						return done(null, null, { message: "使用者密碼錯誤" });
					} else {
						console.error("密碼驗證發生未知錯誤:", passwordError);
						return done(null, null, { message: "密碼驗證錯誤: " + passwordError.message });
					}
				}
			} catch (error) {
				console.error("Passport 登入錯誤:", error.message, error.stack);
				if (error.message === "ACCOUNT") {
					return done(null, null, { message: "使用者帳號不存在" });
				} else if (error.message === "PASSWORD") {
					return done(null, null, { message: "使用者密碼錯誤" });
				} else {
					console.error("未捕獲的錯誤類型:", error);
					return done(null, null, { message: "未知錯誤: " + error.message });
				}
			}
		}
	)
);

passport.use(
	"jwt",
	new passportJWT.Strategy(
		{
			jwtFromRequest: passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKey: process.env.JWT_SECRET,
			passReqToCallback: true,
			ignoreExpiration: true
		},
		async (req, payload, done) => {
			try {
				const expired = payload.exp * 1000 < new Date().getTime();
				const url = req.baseUrl + req.path;
				if (expired && url !== "/user/extend" && url !== "/user/logout") {
					throw new Error("EXPIRED");
				}

				const token = passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken()(req);
				const user = await User.findOne({ _id: payload._id, tokens: token });
				if (!user) {
					throw new Error("JWT");
				}

				return done(null, { user, token }, null);
			} catch (error) {
				console.log(error);
				if (error.message === "EXPIRED") {
					return done(null, null, { message: "登入過期" });
				} else if (error.message === "JWT") {
					return done(null, null, { message: "登入無效" });
				} else {
					return done(null, null, { message: "未知錯誤" });
				}
			}
		}
	)
);
