import { Router, type IRouter } from "express";
import healthRouter from "./health";
import weighStationsRouter from "./weighStations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(weighStationsRouter);

export default router;
