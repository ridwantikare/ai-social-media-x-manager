import { Router, type IRouter } from "express";
import healthRouter from "./health";
import keywordsRouter from "./keywords";
import contentRouter from "./content";
import zernioRouter from "./zernio";
import analyticsRouter from "./analytics";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(keywordsRouter);
router.use(contentRouter);
router.use(zernioRouter);
router.use(analyticsRouter);
router.use(settingsRouter);

export default router;
