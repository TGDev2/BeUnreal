import React, { useEffect, useState } from 'react';
import {
    IonAlert,
    IonButton,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonPage,
    IonSpinner,
    IonTitle,
    IonToast,
    IonToolbar,
    type AlertInput,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    addMembers,
    createGroup,
    getUserGroups,
    getGroup,
    Group,
} from '../services/groupService';
import { getContacts } from '../services/contactService';
import { UserProfile } from '../services/userService';
import { supabase } from '../services/supabaseClient';

const Groups: React.FC = () => {
    const { session } = useAuth();
    const uid = session!.user.id;
    const history = useHistory();

    const [groups, setGroups] = useState<Group[]>([]);
    const [contacts, setContacts] = useState<UserProfile[]>([]);
    const [busy, setBusy] = useState(true);
    const [toast, setToast] = useState<string>();
    const [showCreate, setShowCreate] = useState(false);

    /* ──────────────────────────────────────────────
     *  Chargement initial groupes + contacts
     * ──────────────────────────────────────────────*/
    useEffect(() => {
        const load = async () => {
            try {
                const [g, c] = await Promise.all([getUserGroups(uid), getContacts(uid)]);
                setGroups(g);
                setContacts(c);
            } catch (e: any) {
                setToast(e.message);
            } finally {
                setBusy(false);
            }
        };
        load();
    }, [uid]);

    /* ──────────────────────────────────────────────
     *  LIVE : nouvel ajout dans group_members
     * ──────────────────────────────────────────────*/
    useEffect(() => {
        const channel = supabase
            .channel(`user-groups:${uid}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'group_members',
                    filter: `user_id=eq.${uid}`,
                },
                async (payload) => {
                    try {
                        const groupId = (payload.new as { group_id: string }).group_id;
                        if (!groups.some((g) => g.id === groupId)) {
                            const g = await getGroup(groupId);
                            if (g) setGroups((prev) => [...prev, g]);
                        }
                    } catch {/* silencieux : pas critique */ }
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [uid, groups]);

    /* ---------- Helpers ---------- */
    const refreshGroups = async () => {
        try {
            setGroups(await getUserGroups(uid));
        } catch (e: any) {
            setToast(e.message);
        }
    };

    const contactInputs: AlertInput[] = contacts.map((c) => ({
        name: 'contacts',
        type: 'checkbox',
        label: c.username ?? c.email ?? 'Unnamed user',
        value: c.id,
    }));

    const alertInputs: AlertInput[] = [
        { name: 'groupName', type: 'text', placeholder: 'Group name' },
        ...contactInputs,
    ];

    const handleCreate = async (e: CustomEvent) => {
        const { role, data } = e.detail as {
            role: string;
            data: { values: Record<string, any> };
        };
        if (role !== 'confirm') return;

        const name = (data.values.groupName ?? '').trim();
        /* Normalise en tableau (IonAlert → string | string[]) */
        const raw = data.values.contacts ?? [];
        const ids: string[] = Array.isArray(raw) ? raw : [raw];

        if (!name) return setToast('Group name required');

        try {
            setBusy(true);
            const g = await createGroup(name);
            if (ids.length) await addMembers(g.id, ids);
            await refreshGroups();
            history.push(`/group/${g.id}`);
        } catch (err: any) {
            setToast(err.message);
        } finally {
            setBusy(false);
            setShowCreate(false);
        }
    };

    /* ---------- Render ---------- */
    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Groups</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                {busy && <IonSpinner name="dots" />}

                {!busy && (
                    <>
                        <IonList>
                            {groups.map((g) => (
                                <IonItem key={g.id} routerLink={`/group/${g.id}`}>
                                    <IonLabel>{g.name}</IonLabel>
                                </IonItem>
                            ))}
                            {groups.length === 0 && (
                                <IonItem lines="none">
                                    <IonLabel className="ion-text-center">
                                        You don’t belong to any group yet.
                                    </IonLabel>
                                </IonItem>
                            )}
                        </IonList>

                        <IonButton expand="block" className="ion-margin-top" onClick={() => setShowCreate(true)}>
                            New Group
                        </IonButton>
                    </>
                )}

                <IonAlert
                    isOpen={showCreate}
                    header="Create new group"
                    inputs={alertInputs}
                    buttons={[
                        { text: 'Cancel', role: 'cancel' },
                        { text: 'Create', role: 'confirm' },
                    ]}
                    onDidDismiss={handleCreate}
                />

                <IonToast
                    isOpen={!!toast}
                    message={toast}
                    duration={2500}
                    onDidDismiss={() => setToast(undefined)}
                />
            </IonContent>
        </IonPage>
    );
};

export default Groups;
