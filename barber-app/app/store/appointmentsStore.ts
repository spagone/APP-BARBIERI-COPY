export type AppointmentStatus = 'confirmed' | 'cancelled';

export type StoredAppointment = {
  id: string;
  shopId: string;
  shopName: string;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  price: number;
  durationMin: number;
  startAt: number;
  endAt: number;
  status: AppointmentStatus;
  cancelledReason?: string;
  createdAt: number;
  clientEmail: string;
  clientName: string;
};

let appointments: StoredAppointment[] = [];

const cloneAppointment = (appointment: StoredAppointment): StoredAppointment => ({ ...appointment });

export const getAllAppointments = (): StoredAppointment[] => {
  return appointments.map(cloneAppointment);
};

export const getAppointmentsForClient = (clientEmail: string): StoredAppointment[] => {
  return appointments.filter((appointment) => appointment.clientEmail === clientEmail).map(cloneAppointment);
};

export const addAppointment = (appointment: StoredAppointment) => {
  appointments = [cloneAppointment(appointment), ...appointments];
};

export const updateAppointmentById = (
  appointmentId: string,
  updater: (appointment: StoredAppointment) => StoredAppointment
) => {
  appointments = appointments.map((appointment) =>
    appointment.id === appointmentId ? cloneAppointment(updater(cloneAppointment(appointment))) : appointment
  );
};
