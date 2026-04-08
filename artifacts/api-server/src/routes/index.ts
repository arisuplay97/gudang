// @ts-nocheck
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import mastersRouter from "./masters";
import itemsRouter from "./items";
import stockInRouter from "./stock-in";
import stockOutRouter from "./stock-out";
import mutationsRouter from "./mutations";
import adjustmentsRouter from "./adjustments";
import opnameRouter from "./opname";
import reportsRouter from "./reports";
import dashboardRouter from "./dashboard";
import returnsRouter from "./returns";
import projectsRouter from "./projects";
import jobTypesRouter from "./job-types";
import borrowingRouter from "./borrowing";
import entrustedRouter from "./entrusted";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(mastersRouter);
router.use(itemsRouter);
router.use(stockInRouter);
router.use(stockOutRouter);
router.use(mutationsRouter);
router.use(adjustmentsRouter);
router.use(opnameRouter);
router.use(reportsRouter);
router.use(dashboardRouter);
router.use(returnsRouter);
router.use(projectsRouter);
router.use(jobTypesRouter);
router.use(borrowingRouter);
router.use(entrustedRouter);

export default router;
