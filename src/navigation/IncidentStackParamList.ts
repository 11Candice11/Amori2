export type IncidentStackParamList = {
  HelpDesk: undefined;
  IncidentList: { filter?: string } | undefined;
  LogIncident: undefined;
  IncidentDetail: { incidentId: string };
  IncidentConversation: { incidentId: string };
  AddResponse: { incidentId: string };
  AddNote: { incidentId: string };
  IncidentHistory: { incidentId: string };
  IncidentSla: { incidentId: string };
  ResolveIncident: { incidentId: string };
  CloseIncident: { incidentId: string };
  ReopenIncident: { incidentId: string };
  IncidentReview: { incidentId: string };
  IncidentLessons: { incidentId: string };
  Splitting: undefined;
};
