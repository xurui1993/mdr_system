export const getWorkspaceId = () => {
    let wid = localStorage.getItem('app_workspace_id');
    return wid || 'default-workspace';
};
