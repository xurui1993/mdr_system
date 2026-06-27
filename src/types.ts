export interface Theme {
  name: string;
  runner: string;
  target: string;
  spin_frames: string[];
  icon: string;
  title: string;
  logo: string;
  sub: string;
  kite: string;
  term_head: string;
  log_init: string;
  footer: string;
  lbl_city: string;
  lbl_type: string;
  lbl_config: string;
  lbl_source: string;
  lbl_workspace: string;
  btn_config: string;
  btn_source: string;
  btn_workspace: string;
  btn_run: string;
  btn_run_ing: string;
  btn_success: string;
  btn_error: string;
  tab_task: string;
  tab_output: string;
  btn_add_root: string;
}

export interface AppConfig {
  city: string;
  issueCycle?: string;
  startDate?: string;
  endDate?: string;
  cookie?: string;
  basePath: string;
  sourcePath: string;
  salaryBindSourcePath?: string;
  cities: string[];
  issueCycles?: string[];
  issueSelectedCities?: string[];
  enableInterceptor?: boolean;
  enableCrossStationMerge?: boolean;
  action?: string;
}

export interface LogEntry {
  text: string;
  level: "INFO" | "SYSTEM" | "WARN" | "ERROR" | "SUCCESS";
}

export interface TaskHistoryRecord {
  id: string;
  name: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED';
}
